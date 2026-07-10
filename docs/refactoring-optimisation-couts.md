# Refactoring ciblé et optimisation des coûts

## Méthode

Ce document liste des constats **concrets, trouvés en lisant le code**, pas des conseils
génériques ("il faudrait mettre du cache partout"). Chaque ligne est vérifiable à l'emplacement
indiqué. Classé par urgence réelle (impact coût/risque constaté) plutôt que par ordre alphabétique.

## 1. Urgent — coût constaté, effort faible

### 1.1 `trackPropertyInteraction` fait 2-3 lectures Firestore non cachées à chaque clic
`apps/location-maison/src/db/property-statistics.db.ts:346-416` — se déclenche à **chaque** clic
WhatsApp/appel/partage/favori sur une fiche annonce (donc potentiellement la fonction la plus
appelée de toute l'app) : `getDoc(statsRef)` (l.350-359), un second `getDoc` conditionnel (l.371),
puis `updateDoc`, puis `calculateMetrics(propertyId)` (l.409) qui fait **encore** un `.get()`
(l.466). Zéro utilisation du `CacheStore` déjà en place et déjà utilisé ailleurs dans le même
repo (`src/app/api/property/*`, `src/app/api/location/*`). `getPropertyStatistics` (même fichier,
l.422-456, utilisé par le dashboard "mes stats" annonceur) a le même problème : re-fetch complet
sans cache à chaque appel.

**Impact** : lectures Firestore facturées à l'usage — un chemin à très haute fréquence sans cache
est le candidat n°1 pour une facture Firestore qui grimpe sans que le trafic utilisateur ait
proportionnellement grandi.

**Action** : appliquer le `CacheStore` existant à ce chemin (TTL court, quelques secondes à
quelques minutes selon la tolérance à la fraîcheur des stats), sur le modèle de ce qui est déjà
fait dans `src/app/api/property/*`. Pas besoin d'inventer un nouveau mécanisme.

### 1.2 Réindexation Algolia complète à chaque déploiement de l'extension
`apps/location-maison/extensions/firestore-algolia-search.env:6` — `DO_FULL_INDEXING=true`
resynchronise **toute** la collection `properties` vers Algolia à chaque redéploiement de
l'extension, au lieu de ne compter que sur la synchronisation incrémentale déclenchée par les
triggers Firestore. Chaque redéploiement = un ré-index complet = coût Algolia (écritures) et
invocations Cloud Function proportionnels au nombre total d'annonces, pas au nombre de
changements réels.

**Action** : passer à `DO_FULL_INDEXING=false` pour les déploiements courants ; ne repasser à
`true` que ponctuellement si une resynchronisation complète est explicitement nécessaire
(ex: après un changement de schéma des champs indexés).

## 2. À planifier — dette réelle, effort moyen

### 2.1 Logique de conversion Timestamp dupliquée dans 8 fichiers (admin)
`toIso`/`toIsoDate` (conversion `Timestamp | Date | {seconds}` → chaîne ISO) réimplémentée avec
de légères variations dans `advertising.repository.ts:21`, `listing-moderation.repository.ts`,
`finance-credits.repository.ts:138`, `admin-user.repository.ts:19`,
`listing-duplicate-review.repository.ts`, `tag.repository.ts:23`, `listing.repository.ts`,
`listing-dedup-advanced.repository.ts`, `social-import.repository.ts:102`.

**Action** : extraire un utilitaire unique. Bon candidat pour `packages/core/src/utils/` (déjà
le socle de code partagé entre les deux apps) plutôt qu'un fichier interne à l'admin, puisque
`location-maison` manipule aussi des `Timestamp` Firestore.

### 2.2 18 repositories admin réimplémentent chacun le même squelette CRUD
`apps/location-maison-admin/src/modules/*/infrastructure/*.repository.ts` — 16 fichiers
appellent chacun indépendamment `getFirebaseAdminDb()` et remappent à la main doc Firestore →
type domaine, écriture `FieldValue.serverTimestamp()`, pagination par curseur. Pas une découverte
séparée du point 2.1 : c'est la même famille de duplication.

**Action** : ne pas viser un ORM générique (surdimensionné pour ce besoin) — extraire seulement
les 20-40 lignes réellement répétées par fichier (mapper Firestore, pagination) en utilitaires
partagés côté admin. Effort moyen, pas urgent, mais chaque nouveau module admin (ex: futurs Réels/
cadeaux) va sinon reproduire la même duplication une fois de plus.

### 2.3 Type de bien géré par chaînes de conditions au lieu du pattern Strategy déjà existant
`location-maison` a déjà résolu ce problème pour le formulaire de publication
(`src/builders/property-form/`, `src/factories/property-form/`, `src/directors/factory.director.ts`)
mais le pattern n'a pas été repris ailleurs :
- `apps/location-maison-admin/src/app/(admin)/dashboard/listings/new/page.tsx` (1482 lignes) —
  chaîne de validation à 13 branches (l.684-734) + chaîne de rendu JSX parallèle (à partir de
  l.1222), une par type de bien (Home/Studio/Apartment/Villa/Desk/Building/...).
- `apps/location-maison/src/components/home-page/PropertyCard.tsx:273-279` — chaîne OR à 7
  branches pour la même raison, plus simple mais même cause.

**Action** : porter le pattern Strategy/Factory déjà validé côté formulaire de publication vers
le formulaire de création admin. Effort non négligeable (1482 lignes à toucher), donc à traiter
comme un chantier dédié plutôt qu'un correctif rapide — mais clairement rentable à moyen terme,
chaque nouveau type de bien ajouté sinon multiplie les branches à maintenir dans 2 endroits en
plus du formulaire annonceur.

## 3. Vérifié sain — pas d'action nécessaire

- **Compression d'images** : `apps/location-maison/src/hooks/useImageDropzone.ts:49` compresse
  déjà côté client avant upload (`maxSizeMB: 0.3, maxWidthOrHeight: 1920`) — correctement calibré,
  rien à changer.
- **Cloud Functions memory/minInstances** : aucune fonction ne configure `minInstances` (donc pas
  d'instance "chaude" facturée en continu). Une seule fonction fixe explicitement `memory` (sync
  AdSense quotidienne, `512MiB`, raisonnable pour un job planifié une fois par jour).

## 4. Nouveau risque de coût à anticiper (pas encore construit)

**Vidéo (Réels)** : aucune gestion vidéo n'existe aujourd'hui dans le code — la fonctionnalité
Réels ([reels-cadeaux-abonnement.md](./reels-cadeaux-abonnement.md)) part de zéro sur ce plan.
Le stockage et la diffusion vidéo coûtent un ordre de grandeur de plus que les images déjà
maîtrisées par `useImageDropzone` — voir la section dédiée du document Réels pour le détail
(transcodage, limite de durée, choix Cloud Function maison vs service tiers). À chiffrer **avant**
de commencer le développement de cette fonctionnalité, pas après.

## 5. Stratégie de gestion des images (à revoir)

Constat après lecture du code — trois problèmes distincts, tous vérifiés :

- **Une seule taille servie partout** : `apps/location-maison/src/hooks/useImageDropzone.ts:49`
  compresse chaque image à l'upload (`maxSizeMB: 0.3, maxWidthOrHeight: 1920`) — bon réflexe
  côté coût de stockage, mais c'est la **même** image (jusqu'à 300 Ko, 1920px) qui est ensuite
  servie aussi bien en vignette dans une carte de la liste de recherche qu'en grand format sur la
  fiche détail. Aucune variante générée à l'upload (`src/db/file.db.ts:83`, `createFile` — un
  fichier, une URL, pas de miniature).
- **Optimisation Next.js désactivée** : `apps/location-maison/next.config.ts:62` —
  `unoptimized: true` sur `images`. Ça désactive le redimensionnement à la volée par viewport, la
  conversion automatique WebP/AVIF, et le `srcset` responsive que Next.js fournit nativement.
  Résultat concret : une page de recherche avec 20 cartes télécharge potentiellement 20×300 Ko
  d'images en pleine résolution alors qu'une vignette de quelques centaines de pixels de large
  suffirait.
- **Pas de CDN/cache dédié devant Firebase Storage** — les images sont servies directement
  depuis Storage, sans couche de cache HTTP additionnelle (contrairement au `CacheStore`
  applicatif déjà en place pour les données Firestore).

**Pourquoi s'en soucier maintenant plutôt que d'attendre** : c'est le même type de coût que la
vidéo/Reels ([reels-cadeaux-abonnement.md §5](./reels-cadeaux-abonnement.md#5-co%C3%BBts-et-implications-techniques-greenfield-vid%C3%A9o))
mais sur un flux déjà massif aujourd'hui (chaque annonce a plusieurs photos, chaque page de
recherche affiche des dizaines de cartes) — contrairement à la vidéo qui est encore à construire,
l'inefficacité images est **déjà en production**.

**Cause racine de `unoptimized: true` (vérifiée, pas une supposition)** : archéologie git —
introduit le 20/12/2024 (commit `1d148c08`, "feat: ajout du fichier next config") sans aucune
justification écrite. L'API Vercel confirme que l'équipe `glenneriss' projects` est sur le **plan
Hobby (gratuit)**, avec `enableImageOptimizationNewPrice: true`. Le plan Hobby inclut 5 000
transformations d'image gratuites/mois ; au-delà, les nouvelles images échouent avec une erreur
HTTP 402 (image cassée) — **pas de facturation automatique**, mais un blocage silencieux. Un
marketplace avec plusieurs photos par annonce × cartes de recherche affichant des dizaines
d'annonces épuise ce quota en quelques jours d'usage normal : `unoptimized: true` était très
probablement le correctif d'urgence contre des images cassées en prod, pas un choix architectural.
Point annexe : le plan Hobby est contractuellement réservé à un usage non-commercial, ce qui
concerne les 12 projets de l'équipe indépendamment du sujet images.

**Pistes à évaluer** :
1. Réactiver l'optimisation Next.js (`unoptimized: false`) — nécessite un upgrade Vercel Pro
   (20$/mois, quota mutualisé avec les 11 autres projets de l'équipe) pour rester fiable au-delà
   de 5 000 transformations/mois. Non fait, décision séparée à trancher plus tard.
2. **Fait** (voir plus bas) : génération d'une vignette basse résolution à l'upload, servie dans
   les contextes liste (recherche, favoris, gestion des annonces), indépendante de tout service
   tiers — répond à l'essentiel du problème de bande passante sans dépendre du quota Vercel.
3. Évaluer un CDN/proxy de transformation d'image (Cloudflare Images, ou l'optimiseur Next.js
   réactivé) — non fait, piste ouverte si le besoin de redimensionnement à la volée/WebP-AVIF
   automatique se confirme malgré la vignette.

### Vignette à l'upload — implémenté

`createFile` (`apps/location-maison/src/db/file.db.ts`) génère désormais, en plus du fichier
principal (1920px/300 Ko), une vignette (640px/80 Ko, même lib `browser-image-compression`)
uploadée sous `thumb_<nom-fichier>` à côté du fichier principal. Le type `Image`
(`src/models/annonce.d.ts`) porte deux champs optionnels `thumbURL`/`thumbPATH` — optionnels
pour ne pas casser les annonces déjà publiées (pas de backfill). Un nouvel helper
`resolveThumbnailUrl` (`src/lib/property-images.ts`) centralise la règle "vignette si dispo,
sinon image pleine résolution" ; utilisé dans les 5 contextes liste (`PropertyCard`,
`ListPropertySection`, `SectionFavoris`, `AdManagementPage`, l'API `/api/map/properties`). Les
vues détail (fiche annonce, carousel, partage, opengraph-image) continuent d'utiliser l'image
pleine résolution, inchangées. Génération de la vignette best-effort (échec silencieux, log +
fallback sur `fileURL`) : n'a jamais pu empêcher une publication d'annonce.

## Ordre de traitement suggéré

1. **1.1 et 1.2** (cette semaine, effort faible, impact direct sur la facture Firestore/Algolia
   actuelle — indépendant de toute nouvelle fonctionnalité).
2. **2.1** (rapide une fois qu'on commence à toucher `packages/core` de toute façon).
3. **2.3 et 2.2** (chantiers de fond, à interlacer avec le développement produit plutôt qu'à
   bloquer dessus — voir [10-roadmap.md](./10-roadmap.md)).
4. **5 (images)** : vignette à l'upload faite (gain sans coût). Réactivation de l'optimiseur
   Next/Vercel Pro et CDN restent des pistes ouvertes, à trancher séparément si le besoin se
   confirme.
