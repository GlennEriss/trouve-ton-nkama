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
    // Tous les attributs utilisés pour les filtres et les facettes de l'UI
    attributesForFaceting: [
        'province',
        'city',
        'street',
        'typeProperty',
        'tags',
        'status',
        'state',
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
