# Script de récupération des posts Facebook avec Axesso

## Prérequis

- Node.js (v18 ou plus recommandé)
- npm (ou yarn)

## Installation des dépendances

Dans le dossier racine du projet (ou dans scripts/axesso si tu as un package.json local) :

```bash
npm install axios dotenv js-yaml
```

## Configuration

1. Place un fichier `.env` dans le dossier `scripts/axesso` avec tes clés API :

```
PRIMARY_KEY=ta_clé_axesso
SECONDARY_KEY=ta_clé_secondaire
```

2. Remplis le fichier `facebook-pages.ts` avec les IDs de pages Facebook à scraper.
3. Configure les paramètres dans `axesso.yaml` (quotas, date de début, nombre de posts, etc).

## Compilation du script

Dans le dossier `scripts/axesso` :

```bash
npx tsc fetch-facebook-posts.ts
```

Cela va générer un fichier `fetch-facebook-posts.js` dans le même dossier.

## Exécution du script compilé

Toujours dans `scripts/axesso` :

```bash
node fetch-facebook-posts.js
```

Le script va :
- Lire la config YAML, les pages, les curseurs, l’historique d’usage et les posts existants
- Récupérer les posts Facebook via l’API Axesso en respectant les quotas
- Mettre à jour les fichiers `property.json`, `cursors.json` et `api-usage.json`

---

**Remarque** : tu peux relancer le script autant de fois que tu veux, il reprendra là où il s’est arrêté grâce aux fichiers de persistance. 