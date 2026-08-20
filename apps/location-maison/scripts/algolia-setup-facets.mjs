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
const headers = {
    'X-Algolia-Application-Id': APP_ID,
    'X-Algolia-API-Key': ADMIN_API_KEY,
    'Content-Type': 'application/json',
};

// Attributs que CE script veut garantir présents. Ce n'est plus la liste complète envoyée
// telle quelle : le script lit d'abord les settings réels de l'index et fusionne (union)
// plutôt que de remplacer — voir l'incident du 2026-08-16 ci-dessous. Un attribut retiré
// d'ici ne sera donc jamais supprimé automatiquement par ce script (suppression volontaire
// = geste manuel séparé, jamais un simple oubli dans cette liste).
const DESIRED_FACETS = [
    'province',
    'city',
    'street',
    'typeProperty',
    'tags',
    'status',
    'state',
    'moderationStatus',
    // Multi-catégories (Lot 1) : facette hiérarchique pour la recherche/l'accueil par
    // catégorie (voir docs/marketplace-multi-categories/03-page-recherche.md).
    'categoryId',
    'categoryPath.lvl0',
    'categoryPath.lvl1',
    // Filtres d'attributs dynamiques par feuille (Lot 4, filtres de recherche Mode) —
    // notation pointée sur l'objet `attributes` indexé tel quel (pas d'aplatissement en
    // attr_<key>, voir src/lib/search/search-filter-query.ts). Union des champs facetable
    // des 4 feuilles Mode seedées (apps/location-maison-admin/scripts/categories/seed-categories.ts) :
    // une nouvelle feuille avec de nouveaux attributs facetable nécessite d'ajouter ses
    // clés ici (pas de wildcard possible côté Algolia).
    'attributes.taille',
    'attributes.marque',
    'attributes.genre',
    'attributes.etat',
    'attributes.couleur',
    'attributes.pointure',
    'attributes.contenance',
    'attributes.type',
    'attributes.categorieAccessoire',
];

// ⚠️ Incident réel (2026-08-16) : une version antérieure de ce script faisait un PUT avec
// une liste hardcodée qui ne listait pas `moderationStatus`, alors déjà facettable en prod
// (ajouté hors de ce script à un moment donné). PUT settings REMPLACE attributesForFaceting
// en entier (pas de fusion côté Algolia) — le relancer a fait disparaître `moderationStatus`
// de l'index, cassant TOUTES les requêtes de la plateforme (elle filtre systématiquement
// moderationStatus:"APPROVED"), pas seulement le filtre visé par le run. Corrigé
// structurellement ici : le script lit désormais les settings réels avant d'écrire, et
// n'envoie que l'union — plus jamais un remplacement aveugle par une liste figée.
console.log('→  Lecture des settings actuels de l\'index...');
const currentResponse = await fetch(url, { method: 'GET', headers });
const currentSettings = await currentResponse.json();

if (!currentResponse.ok) {
    console.error('❌  Erreur Algolia (lecture) :', currentSettings);
    process.exit(1);
}

const currentFacets = Array.isArray(currentSettings.attributesForFaceting)
    ? currentSettings.attributesForFaceting
    : [];

const mergedFacets = Array.from(new Set([...currentFacets, ...DESIRED_FACETS]));
const addedFacets = mergedFacets.filter((facet) => !currentFacets.includes(facet));

console.log(`→  ${currentFacets.length} facette(s) déjà en place, ${addedFacets.length} nouvelle(s) :`, addedFacets);

if (addedFacets.length === 0) {
    console.log('✅  Rien à faire, toutes les facettes désirées sont déjà présentes.');
    process.exit(0);
}

const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ attributesForFaceting: mergedFacets }),
});

const data = await response.json();

if (!response.ok) {
    console.error('❌  Erreur Algolia (écriture) :', data);
    process.exit(1);
}

console.log('✅  attributesForFaceting mis à jour avec succès (fusion, aucune facette existante supprimée)');
console.log('   taskID:', data.taskID, '— les changements sont asynchrones (~quelques secondes)');
