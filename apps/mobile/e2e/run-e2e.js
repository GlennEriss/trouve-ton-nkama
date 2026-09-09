#!/usr/bin/env node
/**
 * Tests e2e de la bottom navigation bar, pilotés directement via adb/uiautomator
 * (pas de framework externe — voir docs/mobile/troubleshooting pour le contexte : Maestro et
 * Homebrew se sont révélés impraticables sur ce réseau, uiautomator est déjà disponible avec
 * le SDK Android). Une seule relance à froid en début de session, puis navigation à chaud
 * d'onglet en onglet (tap sur le testID du bouton, exposé côté Android en tant que resource-id
 * par React Native) : mesure le temps écoulé jusqu'à l'apparition de l'écran de destination
 * (lui aussi identifié par testID) à chaque étape.
 *
 * Usage : node e2e/run-e2e.js [--device <serial>] [--package <appId>] [--only <nom>]
 */
const { argValue, DEVICE, PACKAGE, adb, sleep, waitForTestID, tapTestID, startAppAndDismissLogBox } = require('./lib');

// Une seule relance à froid, puis navigation à chaud d'onglet en onglet dans la même session —
// c'est ce que décrit la demande ("si on clique sur X ça emmène vers Y") : un utilisateur qui
// tape d'un bouton à l'autre dans l'app déjà ouverte, pas 5 démarrages à froid indépendants
// (le démarrage JS à froid en dev prend 10-20s à lui seul et fausserait la mesure de navigation).
const STEPS = [
  {
    name: 'Recherche',
    tabTestID: 'tab-recherche',
    destinationTestID: 'screen-recherche',
  },
  {
    name: 'Réels',
    tabTestID: 'tab-reels',
    destinationTestID: 'screen-reels',
  },
  {
    name: 'Accueil',
    tabTestID: 'tab-accueil',
    destinationTestID: 'screen-accueil',
  },
  {
    name: 'Connexion',
    tabTestID: 'tab-connexion',
    destinationTestID: 'screen-connexion',
    // SignIn est un Stack.Group racine affiché en modal par-dessus le Drawer/Tabs (voir
    // RootNavigator.tsx) : une fois dessus, la bottom nav n'est plus dans l'arbre. On revient
    // en arrière (bouton système) pour que l'étape suivante retrouve ses boutons d'onglets.
    dismissAfter: true,
  },
  {
    name: 'Publier (+, invité → redirection Connexion)',
    tabTestID: 'tab-publier',
    destinationTestID: 'screen-connexion',
    dismissAfter: true,
  },
];

async function runStep(step) {
  // Filet de sécurité contre la mise en veille de l'écran entre deux étapes (voir relaunchApp).
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  const tapStart = Date.now();
  await tapTestID(step.tabTestID);
  const elapsedMs = await waitForTestID(step.destinationTestID, 20000);
  const result = { ...step, elapsedMs, tapToVisibleMs: Date.now() - tapStart };
  if (step.dismissAfter) {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
    await waitForTestID('tab-accueil', 10000);
  }
  return result;
}

async function main() {
  console.log(`Appareil : ${DEVICE} — Package : ${PACKAGE}\n`);
  const only = argValue('--only', null);
  const stepsToRun = only ? STEPS.filter((s) => s.name.toLowerCase().includes(only.toLowerCase())) : STEPS;

  process.stdout.write('▶ Démarrage de l\'app (état initial : Accueil) ... ');
  const { startupMs, dismissed } = await startAppAndDismissLogBox();
  console.log(`OK — ${startupMs} ms`);
  if (dismissed) console.log('  (notice LogBox fermée avant de commencer la navigation)');

  const results = [];
  for (const step of stepsToRun) {
    process.stdout.write(`▶ ${step.name} ... `);
    try {
      const result = await runStep(step);
      results.push({ ...result, status: 'PASS' });
      console.log(`OK — ${result.elapsedMs} ms`);
    } catch (err) {
      results.push({ ...step, status: 'FAIL', error: err.message });
      console.log(`ÉCHEC — ${err.message}`);
    }
  }

  console.log('\n=== Résumé ===');
  const width = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const label = r.name.padEnd(width, ' ');
    if (r.status === 'PASS') {
      console.log(`✓ ${label}  ${String(r.elapsedMs).padStart(6)} ms`);
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
