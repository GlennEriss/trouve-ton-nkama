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
 * Usage : node e2e/run-e2e.js [--device <serial>] [--package <appId>]
 */
const { execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const PACKAGE = argValue('--package', 'com.tonnkama.app');
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const ADB_PATH = path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb');
const ADB = fs.existsSync(ADB_PATH) ? ADB_PATH : 'adb';

function resolveDevice() {
  const explicit = argValue('--device', null);
  if (explicit) return explicit;
  const out = execFileSync(ADB, ['devices']).toString();
  const line = out.split('\n').find((l) => l.trim().endsWith('\tdevice'));
  if (!line) throw new Error('Aucun appareil Android connecté (adb devices).');
  return line.split('\t')[0].trim();
}

const DEVICE = resolveDevice();

function adb(cmd) {
  return execFileSync(ADB, ['-s', DEVICE, ...cmd], { maxBuffer: 1024 * 1024 * 20 }).toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Juste après un `am force-stop` + `am start`, le tout premier appel à `uiautomator dump`
// échoue systématiquement ("null root node returned by UiTestAutomationBridge" — le service
// d'accessibilité n'est pas encore prêt) et n'écrit pas de nouveau fichier ; sans vérification,
// `cat` renverrait alors le dump précédent (obsolète) sans jamais lever d'erreur. On revalide
// et réessaie ici plutôt que de laisser la boucle de polling appelante tourner dans le vide.
async function dumpTree(retries = 8, delayMs = 400) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dumpOutput = adb(['shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml']);
      if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] output: ${JSON.stringify(dumpOutput.slice(0, 120))}`);
      if (dumpOutput.includes('dumped to')) {
        const xml = adb(['shell', 'cat', '/sdcard/window_dump.xml']);
        if (xml.includes('<?xml')) return xml;
        if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] cat did not return valid xml, length=${xml.length}`);
      }
    } catch (err) {
      if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] threw: ${err.message}`);
    }
    await sleep(delayMs);
  }
  throw new Error(`uiautomator dump indisponible après ${retries} tentatives.`);
}

// Extrait bounds="[x1,y1][x2,y2]" du premier <node resource-id="...testID..."> trouvé.
function findNodeCenter(xml, testID) {
  const re = new RegExp(`resource-id="${testID}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const boundsFirst = new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*resource-id="${testID}"`);
  const match = xml.match(re) || xml.match(boundsFirst);
  if (!match) return null;
  const [, x1, y1, x2, y2] = match.map(Number);
  return { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) };
}

// La bulle de notification LogBox ("!, Open debugger to view warnings.", en bas de l'écran en
// build dev — déclenchée par des console.warn bénins comme celui de Sentry) couvre une zone
// cliquable qui chevauche presque toute la largeur de la bottom nav, juste au-dessus d'elle.
// Elle absorbe le premier tap envoyé dans cette bande tant qu'elle n'a pas été fermée, ce qui
// faisait systématiquement échouer la toute première navigation après un démarrage à froid
// (constaté et reproduit manuellement). Son bouton "X" n'a pas de content-desc propre, mais il
// est toujours positionné près du bord droit de cette même zone cliquable.
async function dismissLogBoxNoticeIfPresent() {
  const xml = await dumpTree();
  const match = xml.match(/content-desc="!, Open debugger to view warnings\."[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!match) return false;
  const [, , y1, x2, y2] = match.map(Number);
  const dismissX = x2 - 15;
  const dismissY = Math.round((y1 + y2) / 2);
  if (process.env.E2E_DEBUG) console.error(`[logbox] notice détectée, tap dismiss à (${dismissX},${dismissY})`);
  adb(['shell', 'input', 'tap', String(dismissX), String(dismissY)]);
  await sleep(500);
  return true;
}

async function waitForTestID(testID, timeoutMs = 15000, pollMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = await dumpTree();
    if (process.env.E2E_DEBUG) {
      console.error(
        `[wait ${testID}] elapsed=${Date.now() - start}ms xmlLen=${xml.length} tonnkamaInTree=${xml.includes('com.tonnkama.app')}`
      );
    }
    if (xml.includes(`resource-id="${testID}"`)) {
      return Date.now() - start;
    }
    await sleep(pollMs);
  }
  if (process.env.E2E_DEBUG) {
    const xml = await dumpTree();
    const dumpFile = `/tmp/e2e-fail-${testID}.xml`;
    fs.writeFileSync(dumpFile, xml);
    console.error(`[wait ${testID}] échec — arbre final écrit dans ${dumpFile}`);
  }
  throw new Error(`Timeout (${timeoutMs}ms) : testID "${testID}" jamais apparu à l'écran.`);
}

async function tapTestID(testID, timeoutMs = 10000, pollMs = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = await dumpTree();
    const center = findNodeCenter(xml, testID);
    if (center) {
      if (process.env.E2E_DEBUG) console.error(`[tap ${testID}] center=(${center.x},${center.y})`);
      adb(['shell', 'input', 'tap', String(center.x), String(center.y)]);
      return;
    }
    await sleep(pollMs);
  }
  throw new Error(`Timeout (${timeoutMs}ms) : impossible de localiser le testID "${testID}" pour taper dessus.`);
}

async function relaunchApp() {
  adb(['shell', 'am', 'force-stop', PACKAGE]);
  await sleep(500);
  // Filet de sécurité : un cycle force-stop/start répété peut laisser l'écran s'éteindre ou se
  // verrouiller entre deux essais (l'app n'a alors plus le wakelock le temps du redémarrage) ;
  // sans ça, uiautomator ne voit qu'un arbre minimal (écran éteint/verrouillé) indéfiniment.
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  adb(['shell', 'am', 'start', '-n', ACTIVITY]);
}

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
  await relaunchApp();
  const startupMs = await waitForTestID('screen-accueil', 45000);
  console.log(`OK — ${startupMs} ms`);
  const dismissed = await dismissLogBoxNoticeIfPresent();
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
