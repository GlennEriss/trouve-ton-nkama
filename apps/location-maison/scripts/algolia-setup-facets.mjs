/**
 * Configure les attributesForFaceting sur l'index Algolia.
 * Usage: ALGOLIA_ADMIN_API_KEY=xxx node scripts/algolia-setup-facets.mjs
 */

const APP_ID = 'X9XCHZ509R';
const INDEX_NAME = 'location-maison_property-index';
const ADMIN_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
    console.error('❌  Manque la clé admin : ALGOLIA_ADMIN_API_KEY=xxx node scripts/algolia-setup-facets.mjs');
    process.exit(1);
}

const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/${INDEX_NAME}/settings`;

const body = {
    // Tous les attributs utilisés pour les filtres et les facettes de l'UI.
    // ⚠️ PUT settings REMPLACE ce tableau en entier (pas de fusion) — un attribut déjà
    // facettable en prod mais absent d'ici disparaît silencieusement au prochain run.
    // Incident réel (2026-08-16) : ce fichier ne listait pas `moderationStatus`, qui était
    // pourtant déjà facettable en prod (ajouté hors de ce script à un moment donné) — le
    // relancer a fait disparaître `moderationStatus` de la liste, cassant TOUTES les
    // requêtes de la plateforme (elle filtre systématiquement moderationStatus:"APPROVED"),
    // pas seulement le filtre par catégorie visé. Avant de relancer ce script, comparer
    // d'abord la liste ci-dessous à un GET réel des settings de prod.
    attributesForFaceting: [
        'province',
        'city',
        'street',
        'typeProperty',
        'tags',
        'status',
        'state',
        'moderationStatus',
        // Multi-catégories (Lot 1) : facette hiérarchique pour la recherche/l'accueil par
        // catégorie (voir docs/marketplace-multi-categories/03-page-recherche.md). Les
        // facettes par attribut dynamique (attributes.taille, etc.) arrivent au Lot 4,
        // une fois qu'il existe des annonces mode indexées pour les peupler.
        'categoryId',
        'categoryPath.lvl0',
        'categoryPath.lvl1',
    ],
};

const response = await fetch(url, {
    method: 'PUT',
    headers: {
        'X-Algolia-Application-Id': APP_ID,
        'X-Algolia-API-Key': ADMIN_API_KEY,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
});

const data = await response.json();

if (!response.ok) {
    console.error('❌  Erreur Algolia :', data);
    process.exit(1);
}

console.log('✅  attributesForFaceting mis à jour avec succès');
console.log('   taskID:', data.taskID, '— les changements sont asynchrones (~quelques secondes)');
