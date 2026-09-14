#!/usr/bin/env node
/**
 * Tests e2e de la page Recherche — voir run-e2e.js pour le contexte général (adb/uiautomator
 * direct, pas de framework externe). Couvre :
 *  - accès depuis la bottom nav ET depuis l'icône loupe de la navbar (temps de chargement) ;
 *  - la barre de recherche (saisie + soumission) ;
 *  - ouverture / fermeture de la modale Filtres ;
 *  - les pills catégorie (Immobilier / Mode) ;
 *  - les sous-catégories Mode (Accessoires, Chaussures, Parfums & beauté, Vêtements) ;
 *  - les sous-catégories Immobilier (Maison, Villa, Appartement, Terrain, Studio...) — temps
 *    par chip.
 *
 * Les temps mesurés vont du tap jusqu'à ce que la liste soit "stabilisée" (au moins une carte
 * d'annonce visible OU le message "Aucune annonce trouvée") — ils incluent l'aller-retour
 * réseau vers le proxy Algolia et le rendu, à interpréter comme des temps de dev (bundle non
 * minifié servi par Metro, backend Next dev), pas des temps de production.
 *
 * Usage : node e2e/run-e2e-search.js [--device <serial>] [--package <appId>] [--only <nom>]
 */
const {
  argValue,
  DEVICE,
  PACKAGE,
  adb,
  sleep,
  dumpTree,
  countTestID,
  typeText,
  waitForTestID,
  waitForTestIDGone,
  tapTestID,
  relaunchApp,
  bringAppToForeground,
  isSoftKeyboardShown,
  keepScreenAwake,
  releaseScreenAwake,
  startAppAndDismissLogBox,
  dismissLogBoxNoticeIfPresent,
} = require('./lib');

// Attend que la liste de résultats soit stabilisée après un changement de filtre : au moins une
// carte, ou le message vide (certains types immobilier — Kiosque, Entrepôt... — ont 0 annonce).
async function waitForResultsSettled(timeoutMs = 45000, pollMs = 300) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = await dumpTree();
    if (countTestID(xml, 'property-card') > 0 || xml.includes('Aucune annonce trouvée')) {
      return { ms: Date.now() - start, cards: countTestID(xml, 'property-card') };
    }
    await sleep(pollMs);
  }
  throw new Error(`Timeout (${timeoutMs}ms) : la liste de résultats ne s'est jamais stabilisée.`);
}

// Remet l'app dans un état stable avant chaque test : la ramène au premier plan (un test
// précédent a pu la laisser en arrière-plan), puis ferme un clavier / une modale restés
// ouverts — mais uniquement s'ils sont réellement là. Sur ce Samsung, un KEYCODE_BACK (ou
// KEYCODE_ESCAPE, qui y est mappé sur BACK) émis alors qu'il n'y a rien à fermer agit comme
// un "retour" et met l'app en arrière-plan → l'écran d'accueil, ce qui faisait ensuite
// échouer toute la suite (fenêtre MainActivity masquée, tous les dumps montrant le launcher).
async function recoverToStableState() {
  await bringAppToForeground();
  // La bulle LogBox (voir dismissLogBoxNoticeIfPresent, lib.js) peut réapparaître entre deux
  // cas (nouveau console.warn) et chevauche la bottom nav — sans ce dismiss, le tap suivant sur
  // un onglet est absorbé par elle et échoue silencieusement.
  await dismissLogBoxNoticeIfPresent();
  if (isSoftKeyboardShown()) {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
    await sleep(400);
  }
  const xml = await dumpTree();
  if (xml.includes('resource-id="filters-apply"')) {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
    await sleep(600);
  }
}

// Premier testID d'option réelle (pas "Tous / Toutes") sous un LocationSelect donné — les
// valeurs viennent d'Algolia (facette sur les vraies annonces indexées, voir
// src/api/algolia.ts), donc ce test ne peut pas connaître à l'avance un nom de province/ville
// précis : on prend simplement la première option proposée, peu importe laquelle.
function firstRealOptionTestID(xml, prefix) {
  const re = new RegExp(`resource-id="(${prefix}-option-[^"]+)"`, 'g');
  const ids = [...xml.matchAll(re)].map((m) => m[1]);
  return ids.find((id) => id !== `${prefix}-option-tout`) ?? null;
}

// Navigue vers un onglet du bas, avec un filet : si le bouton d'onglet est introuvable (écran
// coincé), on relance l'app une fois plutôt que de laisser tous les tests suivants échouer en
// cascade.
async function goToTab(tabTestID, screenTestID) {
  await recoverToStableState();
  try {
    await tapTestID(tabTestID, 8000);
    await waitForTestID(screenTestID, 15000);
    return;
  } catch {
    await relaunchApp();
    // 120s : voir le commentaire équivalent dans startAppAndDismissLogBox (lib.js) — le
    // handshake natif du bridge RN après un force-stop peut prendre 40-90s sur l'émulateur.
    await waitForTestID('screen-accueil', 120000);
    await recoverToStableState();
    await tapTestID(tabTestID, 10000);
    await waitForTestID(screenTestID, 15000);
  }
}

async function goToAccueil() {
  await goToTab('tab-accueil', 'screen-accueil');
}

async function goToRecherche() {
  await goToTab('tab-recherche', 'screen-recherche');
}

const MODE_LEAVES = [
  { slug: 'tout', name: 'Tout Mode' },
  { slug: 'accessoires', name: 'Accessoires' },
  { slug: 'chaussures', name: 'Chaussures' },
  { slug: 'parfums-beaute', name: 'Parfums & beauté' },
  { slug: 'vetements', name: 'Vêtements' },
];

// Sous-ensemble représentatif de PROPERTY_TYPES (SearchScreen.tsx) — pas les 12, pour garder
// le run court : les plus courants + un rare (Terrain) pour voir un cas potentiellement vide.
const IMMO_TYPES = [
  { key: 'tout', name: 'Tout Immobilier' },
  { key: 'Home', name: 'Maison' },
  { key: 'Villa', name: 'Villa' },
  { key: 'Apartment', name: 'Appartement' },
  { key: 'Studio', name: 'Studio' },
  { key: 'Land', name: 'Terrain' },
];

const CASES = [];

CASES.push({
  name: 'Bottom nav → Recherche',
  run: async () => {
    await goToAccueil();
    const t0 = Date.now();
    await tapTestID('tab-recherche');
    const screenMs = await waitForTestID('screen-recherche', 15000);
    const settled = await waitForResultsSettled();
    return `écran ${screenMs} ms, annonces affichées ${Date.now() - t0} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Navbar (icône loupe) → Recherche',
  run: async () => {
    await goToAccueil();
    const t0 = Date.now();
    await tapTestID('header-search');
    const screenMs = await waitForTestID('screen-recherche', 15000);
    const settled = await waitForResultsSettled();
    return `écran ${screenMs} ms, annonces affichées ${Date.now() - t0} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Modale Filtres — ouverture puis fermeture',
  run: async () => {
    await goToRecherche();
    const t0 = Date.now();
    await tapTestID('search-filters-button');
    // `filters-apply` = bouton "Appliquer", présent uniquement dans la modale — signal
    // d'ouverture plus fiable que le conteneur (qui peut persister dans l'arbre).
    await waitForTestID('filters-apply', 8000);
    const openMs = Date.now() - t0;
    const t1 = Date.now();
    await tapTestID('filters-close');
    await waitForTestIDGone('filters-apply', 8000);
    return `ouverture ${openMs} ms, fermeture ${Date.now() - t1} ms`;
  },
});

CASES.push({
  name: 'Filtres — Immobilier : Province/Ville/Quartier (Algolia) + budget min/max',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-immobilier');
    await waitForResultsSettled();

    await tapTestID('search-filters-button');
    await waitForTestID('filters-apply', 8000);

    // Province : première option réelle, peu importe laquelle (vient d'Algolia, voir
    // firstRealOptionTestID).
    await tapTestID('filters-province');
    await waitForTestID('filters-province-modal', 8000);
    let xml = await dumpTree();
    const provinceOption = firstRealOptionTestID(xml, 'filters-province');
    if (!provinceOption) throw new Error("Aucune province renvoyée par Algolia (facette 'province' vide).");
    const t0 = Date.now();
    await tapTestID(provinceOption);
    await waitForTestIDGone('filters-province-modal', 8000);

    // Ville : ne devient choisissable qu'une fois la province sélectionnée (cascade).
    await tapTestID('filters-city');
    await waitForTestID('filters-city-modal', 8000);
    xml = await dumpTree();
    const cityOption = firstRealOptionTestID(xml, 'filters-city');
    if (!cityOption) throw new Error('Aucune ville renvoyée par Algolia pour cette province.');
    await tapTestID(cityOption);
    await waitForTestIDGone('filters-city-modal', 8000);

    // Quartier : cascade sur province + ville — peut légitimement être vide pour une ville
    // donnée (pas toutes les annonces ont un quartier renseigné), donc pas une erreur en soi.
    await tapTestID('filters-street');
    await waitForTestID('filters-street-modal', 8000);
    xml = await dumpTree();
    const streetOption = firstRealOptionTestID(xml, 'filters-street');
    let streetPicked = false;
    if (streetOption) {
      await tapTestID(streetOption);
      await waitForTestIDGone('filters-street-modal', 8000);
      streetPicked = true;
    } else {
      await tapTestID('filters-street-modal-close');
    }
    const cascadeMs = Date.now() - t0;

    await tapTestID('filters-budget-min');
    typeText('10000');
    await tapTestID('filters-budget-max');
    typeText('900000000');
    // Pas de KEYCODE_BACK ici pour fermer le clavier : la modale Filtres traite le bouton
    // retour matériel via son propre onRequestClose (voir SearchScreen.tsx), donc un BACK la
    // fermerait entièrement au lieu de juste masquer le clavier (constaté : "filters-apply"
    // disparaissait de l'arbre après ce BACK). Taper directement sur le bouton fonctionne
    // tel quel, clavier ouvert ou non — mais laisser le temps au layout de se stabiliser après
    // la saisie (adjustResize peut encore être en train de repositionner la ScrollView), sinon
    // les coordonnées calculées par tapTestID peuvent viser une position déjà obsolète.
    await sleep(500);

    await tapTestID('filters-apply');
    const settled = await waitForResultsSettled();

    return `cascade province→ville→quartier en ${cascadeMs} ms (quartier ${streetPicked ? 'choisi' : 'vide pour cette ville'}), budget min/max appliqué, résultats stabilisés en ${settled.ms} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Filtres — Mode : ville (select Algolia, pas de texte libre) + budget minimum',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-mode');
    await waitForResultsSettled();

    await tapTestID('search-filters-button');
    await waitForTestID('filters-apply', 8000);

    let xml = await dumpTree();
    if (xml.includes('resource-id="filters-province"') || xml.includes('resource-id="filters-street"')) {
      throw new Error("Province/Quartier ne devraient pas apparaître en scope Mode.");
    }

    await tapTestID('filters-city');
    await waitForTestID('filters-city-modal', 8000);
    xml = await dumpTree();
    const cityOption = firstRealOptionTestID(xml, 'filters-city');
    let cityPicked = false;
    const t0 = Date.now();
    if (cityOption) {
      await tapTestID(cityOption);
      await waitForTestIDGone('filters-city-modal', 8000);
      cityPicked = true;
    } else {
      await tapTestID('filters-city-modal-close');
    }
    const cityMs = Date.now() - t0;

    await tapTestID('filters-budget-min');
    typeText('5000');
    // Voir le commentaire équivalent dans le cas Immobilier ci-dessus : pas de KEYCODE_BACK,
    // ça fermerait la modale via son onRequestClose au lieu de juste masquer le clavier ; le
    // sleep laisse le temps au layout (adjustResize) de se stabiliser avant de taper.
    await sleep(500);

    await tapTestID('filters-apply');
    const settled = await waitForResultsSettled();

    return `ville ${cityPicked ? `choisie en ${cityMs} ms (Algolia, facette "cities")` : 'vide pour Mode'}, budget minimum appliqué, résultats stabilisés en ${settled.ms} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Chip Immobilier',
  run: async () => {
    await goToRecherche();
    const t0 = Date.now();
    await tapTestID('category-pill-immobilier');
    const settled = await waitForResultsSettled();
    if (settled.cards === 0) throw new Error('Aucune annonce affichée en catégorie Immobilier');
    return `${Date.now() - t0} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Chip Mode',
  run: async () => {
    const t0 = Date.now();
    await tapTestID('category-pill-mode');
    const settled = await waitForResultsSettled();
    if (settled.cards === 0) throw new Error('Aucune annonce affichée en catégorie Mode');
    return `${Date.now() - t0} ms (${settled.cards} cartes)`;
  },
});

CASES.push({
  name: 'Sous-catégories Mode (repli + par chip)',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-mode');
    await waitForResultsSettled();
    await waitForTestID('subcategory-toggle', 15000);
    // Le composant repliable (ChipExpander) est fermé par défaut et se referme après chaque
    // sélection — on le rouvre à chaque tour.
    const timings = [];
    for (const leaf of MODE_LEAVES) {
      await tapTestID('subcategory-toggle');
      const t0 = Date.now();
      await tapTestID(`leaf-pill-${leaf.slug}`);
      const settled = await waitForResultsSettled();
      timings.push(`${leaf.name}: ${Date.now() - t0} ms (${settled.cards})`);
    }
    return timings.join(' | ');
  },
});

CASES.push({
  name: 'Sous-catégories Immobilier (repli + par chip)',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-immobilier');
    await waitForResultsSettled();
    await waitForTestID('subcategory-toggle', 15000);
    const timings = [];
    for (const type of IMMO_TYPES) {
      await tapTestID('subcategory-toggle');
      const t0 = Date.now();
      await tapTestID(`type-pill-${type.key}`);
      const settled = await waitForResultsSettled();
      timings.push(`${type.name}: ${Date.now() - t0} ms (${settled.cards})`);
    }
    return timings.join(' | ');
  },
});

CASES.push({
  name: 'Pagination (scroll vers le bas)',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-toutes');
    await waitForResultsSettled();

    // Titres/prix visibles = uniquement le contenu APRÈS le début de la liste de résultats
    // (sinon on capture le header fixe : placeholder de recherche, pills catégorie...).
    const visibleCardText = (xml) => {
      const i = xml.indexOf('resource-id="search-results-list"');
      const body = i === -1 ? xml : xml.slice(i);
      return (body.match(/text="[^"]{6,}"/g) ?? []).slice(0, 6).join('|');
    };

    const before = visibleCardText(await dumpTree());

    const t0 = Date.now();
    // Swipes vers le haut = scroll vers le bas ; largement au-delà des 20 résultats de la 1re
    // page → doit déclencher fetchNextPage (onEndReached, threshold 0.4).
    for (let i = 0; i < 10; i += 1) {
      adb(['shell', 'input', 'swipe', '360', '1300', '360', '250', '200']);
      await sleep(500);
    }
    const afterXml = await dumpTree();
    const after = visibleCardText(afterXml);

    if (!afterXml.includes('resource-id="screen-recherche"')) throw new Error('Écran Recherche perdu après scroll');
    if (countTestID(afterXml, 'property-card') === 0) throw new Error('Plus aucune carte visible après scroll');
    if (before === after) {
      throw new Error(`Le contenu de la liste n'a pas changé après 10 scrolls (avant="${before.slice(0, 80)}...")`);
    }

    return `liste défilée et contenu renouvelé en ${Date.now() - t0} ms (${countTestID(afterXml, 'property-card')} cartes visibles)`;
  },
});

CASES.push({
  name: 'Barre de recherche (saisie + soumission)',
  run: async () => {
    await goToRecherche();
    await tapTestID('category-pill-toutes');
    await waitForResultsSettled();
    await tapTestID('search-input');
    await sleep(500);
    typeText('villa');
    adb(['shell', 'input', 'keyevent', 'KEYCODE_ENTER']);
    // Tap sur une pill (toujours présente, ne navigue pas) pour dé-focus le champ et fermer le
    // clavier — sinon uiautomator renvoie "could not get idle state" tant que le curseur clignote.
    // KEYCODE_BACK ferait ça mais navigue aussi hors de l'écran si le clavier est déjà fermé.
    await sleep(400);
    await tapTestID('category-pill-toutes');
    await sleep(500);
    const t0 = Date.now();
    const settled = await waitForResultsSettled();
    // On ne peut pas garantir des résultats pour "villa" (dépend des données) — on vérifie
    // juste que la recherche s'exécute sans planter (écran toujours là, pas d'état d'erreur).
    const xml = await dumpTree();
    if (xml.includes('Impossible de charger les annonces')) throw new Error('État erreur après recherche');
    if (!xml.includes('resource-id="screen-recherche"')) throw new Error('Écran Recherche perdu après recherche');
    return `${Date.now() - t0} ms (${settled.cards} cartes pour "villa")`;
  },
});

function setAnimationScale(value) {
  for (const key of ['window_animation_scale', 'transition_animation_scale', 'animator_duration_scale']) {
    try {
      adb(['shell', 'settings', 'put', 'global', key, String(value)]);
    } catch {
      // appareil déconnecté en fin de run — on ne veut pas planter le handler de sortie.
    }
  }
}

async function main() {
  console.log(`Appareil : ${DEVICE} — Package : ${PACKAGE}\n`);
  const only = argValue('--only', null);
  const casesToRun = only ? CASES.filter((c) => c.name.toLowerCase().includes(only.toLowerCase())) : CASES;

  // Animations coupées le temps du run : un ActivityIndicator RN (la barre de refetch)
  // maintient sinon la fenêtre "non idle" et uiautomator renvoie "could not get idle state".
  setAnimationScale(0);
  // Écran maintenu allumé : sur ce Samsung l'écran se verrouillait au bout de ~30 s en plein
  // run, ce qui faisait échouer tous les tests restants (dumps = écran de verrouillage).
  keepScreenAwake();
  process.on('exit', () => {
    setAnimationScale(1);
    releaseScreenAwake();
  });

  process.stdout.write('▶ Démarrage de l\'app (état initial : Accueil) ... ');
  const { startupMs, dismissed } = await startAppAndDismissLogBox();
  console.log(`OK — ${startupMs} ms`);
  if (dismissed) console.log('  (notice LogBox fermée avant de commencer)');

  // Chauffe uiautomator : le tout premier dump après un démarrage à froid + fermeture LogBox
  // renvoie souvent "null root node" en rafale — on absorbe ça ici plutôt que dans le 1er test.
  await sleep(1500);
  for (let i = 0; i < 3; i += 1) {
    try {
      await dumpTree(2, 500);
      break;
    } catch {
      await sleep(1000);
    }
  }

  const results = [];
  for (const testCase of casesToRun) {
    process.stdout.write(`▶ ${testCase.name} ... `);
    adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
    try {
      const detail = await testCase.run();
      results.push({ name: testCase.name, status: 'PASS', detail });
      console.log(`OK — ${detail}`);
    } catch (err) {
      results.push({ name: testCase.name, status: 'FAIL', error: err.message });
      console.log(`ÉCHEC — ${err.message}`);
    }
  }

  console.log('\n=== Résumé ===');
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const label = r.name.padEnd(width, ' ');
    console.log(r.status === 'PASS' ? `✓ ${label}  ${r.detail}` : `✗ ${label}  ÉCHEC : ${r.error}`);
  }

  const failed = results.filter((r) => r.status !== 'PASS');
  if (failed.length > 0) {
    console.log(`\n${failed.length}/${results.length} test(s) échoué(s).`);
    process.exit(1);
  }
  console.log(`\n${results.length}/${results.length} tests réussis.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
