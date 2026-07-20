> **Architecture active (2026)** : voir
> [ARCHITECTURE-CANONIQUE.md](./ARCHITECTURE-CANONIQUE.md). Le document ci-dessous
> décrit l'historique de l'import OSM et ne représente plus à lui seul le flux
> du formulaire public.

### Objectif

Importer la base géographique du Gabon depuis `scripts/openstreetmap/gabon_osm.json` vers Firestore en respectant **le format déjà utilisé par l’application** :

- Collection `provinces` : provinces (ex: Estuaire)
- Collection `cities` : villes/communes (ex: Libreville, Akanda, Owendo, Ntoum…)
- Collection `streets` : quartiers / villages / hameaux / localités (ex: Awoungou, Haut de Gué Gué, PK5…)

Contraintes clés :

- **Éviter les doublons** (les collections contiennent déjà des entrées).
- **Respecter la génération d’ID existante** (cf `src/db/generic.db.ts` → `LocationIdGenerator`).

---

### Source de données (structure réelle)

Le fichier `gabon_osm.json` est généré par `scripts/openstreetmap/gabon_osm_export.mjs` via Overpass et contient deux blocs :

- **`admin_boundaries`** : frontières administratives (OSM relations) groupées par `admin_level`
- **`places`** : lieux (OSM node/way/relation) groupés par `place=*`

Volumes observés dans ce fichier :

- **`admin_boundaries`** :
  - admin_level **4**: 10
  - admin_level **6**: 10
  - admin_level **8**: 2
  - admin_level **9**: 3
  - admin_level **10**: 1
- **`places`** :
  - `city`: 20
  - `town`: 24
  - `suburb`: 83
  - `neighbourhood`: 27
  - `quarter`: 27
  - `village`: 794
  - `hamlet`: 297
  - `locality`: 40

Chaque entrée a la forme :

- `name` + `names.fr/en/local` (optionnels)
- `tags` (tags OSM bruts)
- `center: { lat, lon }` (centre géométrique fourni par Overpass)

---

### Règles de classification (province / city / street) — **100% des éléments**

#### Provinces → collection `provinces`

**Règle (Gabon)** : `admin_boundaries["4"]` (`boundary=administrative` + `admin_level=4`) ⇒ **Province**

⚠️ Particularité observée dans `gabon_osm.json` : on trouve **10** entrées en `admin_level=4`, alors que le Gabon a **9 provinces**.
Dans notre dump, les noms incluent notamment :
- `Nyanga (Gabon)` (variante de nom)
- `Litoral` (entrée OSM qui ne correspond pas à une province gabonaise)

**Décision** (pour respecter “9 provinces” sans rien perdre) :
- On applique une **whitelist des 9 provinces** (avec gestion d’alias, ex `Nyanga (Gabon)` → `Nyanga`) pour remplir `provinces`.
- Toute entrée `admin_level=4` **hors whitelist** est **quand même importée**, mais dans `cities` (puisque le modèle ne prévoit pas d’autre collection dédiée).

Whitelist (noms canoniques) :
- Estuaire
- Haut-Ogooué
- Moyen-Ogooué
- Ngounié
- Nyanga
- Ogooué-Ivindo
- Ogooué-Lolo
- Ogooué-Maritime
- Woleu-Ntem

Pourquoi :
- Au Gabon, `admin_level=4` correspond aux provinces OSM (ex: Estuaire, Haut-Ogooué…).
- C’est stable, peu volumineux et sans ambiguïté.

Champs :
- `name`: priorité à `names.fr` puis `name`
- `country`: `"Gabon"`
- `countryCode`: `"GA"`
- `latitude/longitude`: `center.lat/center.lon`

#### Cities (communes/villes) → collection `cities`

**Règle principale** : `places.city` + `places.town` ⇒ **City**

Justification :
- Les éléments `place=city` et `place=town` représentent la couche “ville/commune” la plus exploitable sans géométrie polygonale.
- Dans ton application, on veut que des villes comme Libreville / Akanda / Owendo / Ntoum soient des `cities`.

**Règle complémentaire** : `admin_boundaries["6"]` + `admin_boundaries["8"]` ⇒ **City**

Note :
- `admin_level=6` et `admin_level=8` correspondent à des subdivisions administratives (ex: départements/communes selon les zones).
- Pour ne **rien perdre**, on les stocke aussi en `cities` (puisque ton domaine ne prévoit pas de collection “départements” séparée).

Champs :
- `name`, `country`, `countryCode`, `latitude/longitude`
- `provinceId/provinceName`: calculés via une stratégie de rattachement (cf section “Rattachement geo”).

#### Streets (quartiers / villages / etc.) → collection `streets`

**Règle principale** :
- `places.suburb`, `places.neighbourhood`, `places.quarter` ⇒ **Street (quartier)**

**Règle “ruralité”** :
- `places.village`, `places.hamlet`, `places.locality` ⇒ **Street (village/hameau/localité)**  
  (dans ton modèle, tout ce qui “constitue une ville” peut être stocké comme une `Street`)

**Règle complémentaire** :
- `admin_boundaries["9"]` et `admin_boundaries["10"]` ⇒ **Street** (subdivisions administratives fines)

Champs :
- `name`, `country`, `countryCode`, `latitude/longitude`
- `cityId/cityName`: calculés si on arrive à rattacher (sinon laissés `undefined`)
- `provinceId/provinceName`: calculés si on arrive à rattacher (sinon `undefined`)

---

### IDs Firestore (anti-doublons)

L’application utilise `LocationIdGenerator` (dans `src/db/generic.db.ts`) :

- **normalisation du nom**: `name.toLowerCase().replace(/\\s+/g, '')`
- **format des coordonnées**: `longitude.toFixed(5)` et `latitude.toFixed(5)`
- **format final**: `${normalizedName}_${lon5}_${lat5}`

Exemples :
- Province: `estuaire_9.47972_0.37722`
- City: `akanda_9.53674_0.58109`
- Street: `3quartiers_9.42467_0.42473`

Ce choix permet :
- d’éviter les collisions de noms
- de différencier deux “mêmes noms” dans des zones différentes
- de “rejouer” un import sans créer de doublons (upsert par ID)

---

### Rattachement géographique (province/city)

Le fichier export ne fournit pas de relation explicite “quartier appartient à ville” (les tags `is_in` sont rarement présents).

Pattern recommandé : **Nearest-neighbor par distance (Haversine) sur centres**

- Pour rattacher une `City` à une `Province` :
  - prendre la province dont le `center` est la plus proche.
- Pour rattacher une `Street` à une `City` :
  - prendre la ville/commune la plus proche parmi les `cities` déjà importées.
  - appliquer un **seuil** (ex: 35 km pour suburb/neighbourhood/quarter, 80 km pour village/hamlet/locality) ; sinon laisser `cityId/cityName` vides.

Important : même sans rattachement parfait, l’ID (nom+lon+lat) reste unique et stable.

---

### Politique “on n’ignore rien” (fallbacks)

Pour garantir **100% d’import**, on applique des fallbacks :

- **Si `name` est manquant** :
  - on génère un nom déterministe : `osm_{type}_{id}` (ex: `osm_relation_123456`)
- **Si `center` est manquant** (rare avec `out center`, mais possible) :
  - on met `{ lon: 0, lat: 0 }` **et** on s’assure que le `name` est unique (via `osm_{type}_{id}`)

Ces entrées restent importées (et traçables), même si elles sont moins “propres” qu’un lieu nommé.

---

### Design pattern & architecture du script (ETL “senior-friendly”)

On adopte un pattern **ETL en pipeline** + une séparation claire :

- **Extract** : lecture de `gabon_osm.json`
- **Transform** :
  - choix du nom (`names.fr` → `name`)
  - génération d’ID (même algo que l’app)
  - rattachement geo (nearest-neighbor)
  - nettoyage (suppression des champs `undefined`)
- **Load** : upsert Firestore par ID (anti-doublon)

Organisation recommandée dans `scripts/openstreetmap/` :

- `osm-loader.js` : lecture + helpers d’accès aux catégories
- `id-generator.js` : reproduction exacte de `LocationIdGenerator`
- `geo.js` : distance Haversine + nearest
- `firestore-admin.js` : init firebase-admin (en s’inspirant de `scripts/firebase/`)
- `import-locations.js` : script principal (CLI)

Bonnes pratiques :
- **Mode `--dry-run`** (ne rien écrire, juste compter/log)
- **Mode `--limit N`** (tester sur un petit lot)
- **Mode `--only provinces|cities|streets`** (import partiel)
- Écriture Firestore en **batch (500 max)** pour performance
- Logs “résumé” + stats (créés / déjà présents / mis à jour)

---

### Prochaines étapes

1. Implémenter `scripts/openstreetmap/import-locations.js` (upsert Firestore)
2. Lancer en `--dry-run` pour valider les volumes
3. Import réel par étapes: provinces → cities → streets
4. Vérification dans Firestore (doublons, rattachements, cohérence)

