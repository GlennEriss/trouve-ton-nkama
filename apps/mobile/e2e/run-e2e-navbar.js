#!/usr/bin/env node
/**
 * Tests e2e de la navbar (hamburger + sidebar/drawer, recherche, se connecter) — voir
 * run-e2e.js pour le contexte général (adb/uiautomator direct, pas de framework externe).
 *
 * uiautomator n'expose que la structure de l'arbre d'accessibilité, jamais les couleurs de
 * rendu : la vérification "ce lien est vert car actif" se fait donc via
 * accessibilityState={{selected}} posé explicitement sur chaque lien du drawer (voir
 * AppDrawerContent.tsx), exposé côté Android en tant qu'attribut `selected="true/false"` —
 * même mécanisme que celui déjà utilisé nativement par la bottom tab bar.
 *
 * Usage : node e2e/run-e2e-navbar.js [--device <serial>] [--package <appId>] [--only <nom>]
 */
const {
  argValue,
  DEVICE,
  PACKAGE,
  adb,
  dumpTree,
  isNodeSelected,
  waitForTestID,
  waitForTestIDGone,
  tapTestID,
  startAppAndDismissLogBox,
} = require('./lib');

const DRAWER_LINKS = [
  { testID: 'drawer-link-search-requests', name: 'Demandes de recherche', destinationTestID: 'screen-search-requests' },
  { testID: 'drawer-link-terms', name: "Conditions d'utilisation", destinationTestID: 'screen-legal-terms' },
  { testID: 'drawer-link-privacy', name: 'Politique de confidentialité', destinationTestID: 'screen-legal-privacy' },
  { testID: 'drawer-link-data-deletion', name: 'Suppression des données', destinationTestID: 'screen-legal-dataDeletion' },
];

async function openDrawer() {
  await tapTestID('header-hamburger');
  await waitForTestID('drawer-content', 8000);
}

async function closeDrawer() {
  await tapTestID('drawer-close');
  await waitForTestIDGone('drawer-content', 8000);
}

// Vérifie qu'un seul lien du drawer est marqué actif (selected=true) — celui attendu — et que
// tous les autres sont bien inactifs (selected=false). Le drawer doit être ouvert au moment
// de l'appel.
async function assertOnlyActiveLink(expectedTestID) {
  const xml = await dumpTree();
  const wrong = [];
  for (const link of DRAWER_LINKS) {
    const selected = isNodeSelected(xml, link.testID);
    const shouldBeSelected = link.testID === expectedTestID;
    if (selected !== shouldBeSelected) {
      wrong.push(`${link.name} : attendu selected=${shouldBeSelected}, obtenu ${selected}`);
    }
  }
  if (wrong.length > 0) {
    throw new Error(`État actif incorrect dans le drawer — ${wrong.join(' | ')}`);
  }
}

// Scroll un ScrollView natif jusqu'à trouver tous les textes attendus (contact, footer...),
// en répétant par lots plutôt qu'en misant sur un seul lot de swipes de taille fixe — le
// rendu/l'inertie de scroll sur cet émulateur varie d'un run à l'autre (constaté : un lot de 8
// swipes suffit parfois, pas toujours), une seule vérification après un lot fixe est donc
// intrinsèquement flaky. S'arrête dès que tout est trouvé, réessaie sinon jusqu'à `maxRounds`.
async function scrollUntilTextsVisible(expectedTexts, { swipesPerRound = 8, maxRounds = 3 } = {}) {
  let xml = await dumpTree();
  for (let round = 0; round < maxRounds; round += 1) {
    const missing = expectedTexts.filter((t) => !xml.includes(`text="${t}`));
    if (missing.length === 0) return xml;
    for (let i = 0; i < swipesPerRound; i += 1) {
      adb(['shell', 'input', 'swipe', '360', '1600', '360', '200', '100']);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    xml = await dumpTree();
  }
  const stillMissing = expectedTexts.filter((t) => !xml.includes(`text="${t}`));
  if (stillMissing.length > 0) {
    throw new Error(`Texte(s) attendu(s) absent(s) après ${maxRounds} lots de scroll : ${stillMissing.join(' | ')}`);
  }
  return xml;
}

const CASES = [];

CASES.push({
  name: 'Hamburger ouvre puis ferme la sidebar',
  run: async () => {
    const t0 = Date.now();
    await openDrawer();
    const openMs = Date.now() - t0;
    const t1 = Date.now();
    await closeDrawer();
    const closeMs = Date.now() - t1;
    return `ouverture ${openMs} ms, fermeture ${closeMs} ms`;
  },
});

for (const link of DRAWER_LINKS) {
  CASES.push({
    name: `Sidebar → ${link.name}`,
    run: async () => {
      await openDrawer();
      await tapTestID(link.testID);
      const navMs = await waitForTestID(link.destinationTestID, 15000);
      // Rouvre le drawer pour vérifier la couleur (via selected) maintenant qu'on est sur la page.
      await openDrawer();
      await assertOnlyActiveLink(link.testID);
      await closeDrawer();
      return `navigation ${navMs} ms, couleur active vérifiée`;
    },
  });
}

CASES.push({
  name: "Conditions d'utilisation — écran natif complet (pas de WebView)",
  run: async () => {
    await openDrawer();
    const t0 = Date.now();
    await tapTestID('drawer-link-terms');
    const navMs = await waitForTestID('screen-legal-terms', 15000);
    const totalMs = Date.now() - t0;

    let xml = await dumpTree();
    if (xml.includes('resource-id="webview"') || xml.includes('resource-id="webView"')) {
      throw new Error('Une WebView est encore montée sur screen-legal-terms — devrait être 100% natif.');
    }

    // Contenu réel visible sans scroll (haut de page) : badge, titre, sous-titre, date, 1re section.
    const topTexts = [
      "Cadre d'utilisation",
      "Conditions d'utilisation",
      'Dernière mise à jour : 5 mars 2026',
      'Objet',
      "Les présentes conditions encadrent l'accès et l'utilisation de la plateforme Trouve Ton Nkama.",
    ];
    const missingTop = topTexts.filter((t) => !xml.includes(`text="${t}`));
    if (missingTop.length > 0) {
      throw new Error(`Texte(s) attendu(s) absent(s) en haut de l'écran : ${missingTop.join(' | ')}`);
    }

    // Scroll jusqu'en bas pour vérifier que le contenu de fin de page (contact, footer) est bien
    // atteignable et lisible — pas seulement le haut de l'écran. Réessaie par lots (voir
    // scrollUntilTextsVisible) : un seul lot de swipes de taille fixe s'est révélé flaky sur cet
    // émulateur (le rendu/l'inertie de scroll varie d'un run à l'autre).
    await scrollUntilTextsVisible([
      'Contact légal :',
      'glenneriss@gmail.com',
      'Ces informations sont publiées par Trouve Ton Nkama.',
    ]);

    return `écran chargé en ${navMs} ms (total avec tap ${totalMs} ms), contenu complet vérifié haut+bas, aucune WebView`;
  },
});

CASES.push({
  name: 'Politique de confidentialité — écran natif complet (pas de WebView)',
  run: async () => {
    await openDrawer();
    const t0 = Date.now();
    await tapTestID('drawer-link-privacy');
    const navMs = await waitForTestID('screen-legal-privacy', 15000);
    const totalMs = Date.now() - t0;

    let xml = await dumpTree();
    if (xml.includes('resource-id="webview"') || xml.includes('resource-id="webView"')) {
      throw new Error('Une WebView est encore montée sur screen-legal-privacy — devrait être 100% natif.');
    }

    // Contenu réel visible sans scroll (haut de page) : badge, titre, sous-titre, date, 1re section.
    const topTexts = [
      'Protection des données',
      'Politique de confidentialité',
      'Dernière mise à jour : 5 mars 2026',
      'Données collectées',
      'Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme et à la qualité de service.',
    ];
    const missingTop = topTexts.filter((t) => !xml.includes(`text="${t}`));
    if (missingTop.length > 0) {
      throw new Error(`Texte(s) attendu(s) absent(s) en haut de l'écran : ${missingTop.join(' | ')}`);
    }

    // Scroll jusqu'en bas — même stratégie par lots que pour l'écran des CGU (voir plus haut).
    await scrollUntilTextsVisible([
      'Vos droits',
      'Contact légal :',
      'glenneriss@gmail.com',
      'Ces informations sont publiées par Trouve Ton Nkama.',
    ]);

    return `écran chargé en ${navMs} ms (total avec tap ${totalMs} ms), contenu complet vérifié haut+bas, aucune WebView`;
  },
});

CASES.push({
  name: 'Suppression des données — écran natif complet (pas de WebView)',
  run: async () => {
    await openDrawer();
    const t0 = Date.now();
    await tapTestID('drawer-link-data-deletion');
    const navMs = await waitForTestID('screen-legal-dataDeletion', 15000);
    const totalMs = Date.now() - t0;

    const xml = await dumpTree();
    if (xml.includes('resource-id="webview"') || xml.includes('resource-id="webView"')) {
      throw new Error('Une WebView est encore montée sur screen-legal-dataDeletion — devrait être 100% natif.');
    }

    // Contenu réel visible sans scroll (haut de page) : titre, sous-titre, date, avertissement.
    const topTexts = [
      'Suppression des Données',
      'Nous respectons votre droit à la confidentialité et à la suppression de vos données',
      'Dernière mise à jour : 28 avril 2025',
      'Important à savoir',
      'La suppression de vos données est irréversible. Une fois supprimées, nous ne pourrons pas restaurer vos informations.',
    ];
    const missingTop = topTexts.filter((t) => !xml.includes(`text="${t}`));
    if (missingTop.length > 0) {
      throw new Error(`Texte(s) attendu(s) absent(s) en haut de l'écran : ${missingTop.join(' | ')}`);
    }

    // Scroll jusqu'en bas — page plus courte que CGU/privacy mais même stratégie par lots.
    await scrollUntilTextsVisible([
      'Comment demander la suppression ?',
      'glenneriss@gmail.com',
      'Objet : « Suppression de compte »',
      // Le lien est imbriqué dans le paragraphe (<Text>...<Text onPress>Politique de
      // Confidentialité</Text>.</Text>) : RN fusionne tout en un seul texte d'accessibilité,
      // donc on cherche la phrase entière plutôt que le lien seul (jamais isolé dans le dump).
      "Pour plus d'informations, consultez notre Politique de Confidentialité.",
    ]);

    return `écran chargé en ${navMs} ms (total avec tap ${totalMs} ms), contenu complet vérifié haut+bas, aucune WebView`;
  },
});

CASES.push({
  name: 'Recherche (icône navbar)',
  run: async () => {
    await tapTestID('header-search');
    const navMs = await waitForTestID('screen-recherche', 15000);
    return `${navMs} ms`;
  },
});

CASES.push({
  name: 'Se connecter (navbar)',
  run: async () => {
    await tapTestID('header-signin');
    const navMs = await waitForTestID('screen-connexion', 15000);
    // Modal plein écran par-dessus le Drawer (voir RootNavigator.tsx) : revient en arrière pour
    // laisser l'app dans un état propre si d'autres cas suivaient. On réapparaît sur l'onglet
    // actif AVANT l'ouverture du modal (pas forcément Accueil — le cas précédent "Recherche
    // icône navbar" laisse par exemple l'app sur l'onglet Recherche) : on attend juste le retour
    // de la bottom nav elle-même (le bouton Accueil, toujours rendu qu'il soit actif ou non).
    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
    await waitForTestID('tab-accueil', 20000);
    return `${navMs} ms`;
  },
});

async function main() {
  console.log(`Appareil : ${DEVICE} — Package : ${PACKAGE}\n`);
  const only = argValue('--only', null);
  const casesToRun = only ? CASES.filter((c) => c.name.toLowerCase().includes(only.toLowerCase())) : CASES;

  process.stdout.write('▶ Démarrage de l\'app (état initial : Accueil) ... ');
  const { startupMs, dismissed } = await startAppAndDismissLogBox();
  console.log(`OK — ${startupMs} ms`);
  if (dismissed) console.log('  (notice LogBox fermée avant de commencer la navigation)');

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
    if (r.status === 'PASS') {
      console.log(`✓ ${label}  ${r.detail}`);
    } else {
      console.log(`✗ ${label}  ÉCHEC : ${r.error}`);
    }
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
