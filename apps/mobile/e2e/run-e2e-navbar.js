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
