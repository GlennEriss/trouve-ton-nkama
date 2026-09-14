#!/usr/bin/env node
/**
 * Fonctions partagées par les scripts e2e (bottom nav, navbar/drawer...) — pilotage direct
 * adb/uiautomator, pas de framework externe (voir run-e2e.js pour le contexte : Maestro et
 * Homebrew se sont révélés impraticables sur ce réseau).
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

// Comme `adb` mais capture aussi stderr (fusionné) et n'échoue jamais sur un code de sortie
// non nul — `uiautomator dump` écrit "null root node returned by UiTestAutomationBridge" et
// "could not get idle state" sur stderr tout en sortant parfois avec 0, donc `adb()` seul ne
// verrait jamais ces messages pour pouvoir réagir (pause de récupération).
function adbCombined(cmd) {
  try {
    const out = execFileSync(ADB, ['-s', DEVICE, ...cmd], {
      maxBuffer: 1024 * 1024 * 20,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.toString();
  } catch (err) {
    return `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Juste après un `am force-stop` + `am start`, le tout premier appel à `uiautomator dump`
// échoue systématiquement ("null root node returned by UiTestAutomationBridge" — le service
// d'accessibilité n'est pas encore prêt) et n'écrit pas de nouveau fichier ; sans vérification,
// `cat` renverrait alors le dump précédent (obsolète) sans jamais lever d'erreur. On revalide
// et réessaie ici plutôt que de laisser la boucle de polling appelante tourner dans le vide.
async function dumpTree(retries = 12, delayMs = 400) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dumpOutput = adbCombined(['shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml']);
      if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] output: ${JSON.stringify(dumpOutput.slice(0, 120))}`);
      if (dumpOutput.includes('dumped to')) {
        const xml = adb(['shell', 'cat', '/sdcard/window_dump.xml']);
        if (xml.includes('<?xml')) return xml;
        if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] cat did not return valid xml, length=${xml.length}`);
      } else if (dumpOutput.includes('null root node') || dumpOutput.includes('could not get idle state')) {
        // Le service UiAutomationBridge est momentanément coincé (appels rapprochés + appareil
        // occupé). Il se débloque tout seul mais a besoin d'une pause plus longue qu'un simple
        // délai de polling — sinon toutes les tentatives s'épuisent sur le même état coincé.
        if (process.env.E2E_DEBUG) console.error(`[dump attempt ${attempt}] service coincé, pause longue`);
        await sleep(2500);
        continue;
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

// Lit accessibilityState.selected (exposé côté Android en tant qu'attribut `selected` du nœud)
// pour un testID donné — utilisé pour vérifier un état "actif" (couleur) sans pouvoir lire de
// vraies couleurs de rendu via uiautomator (l'arbre d'accessibilité n'expose que la structure).
function isNodeSelected(xml, testID) {
  const re = new RegExp(`resource-id="${testID}"[^>]*selected="(true|false)"`);
  const match = xml.match(re);
  return match ? match[1] === 'true' : null;
}

// Nombre de nœuds portant ce resource-id — utilisé pour vérifier "au moins N cartes d'annonce
// affichées" sans dépendre des ids précis (données réelles, imprévisibles).
function countTestID(xml, testID) {
  return (xml.match(new RegExp(`resource-id="${testID}"`, 'g')) ?? []).length;
}

// Saisit du texte dans le champ focus courant (le champ de recherche doit être focus, donc
// tapé juste avant). Mot simple sans espace attendu — `input text` gère mal les espaces.
function typeText(text) {
  adb(['shell', 'input', 'text', text]);
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

async function dumpDebugOnFail(testID) {
  if (!process.env.E2E_DEBUG) return;
  const xml = await dumpTree();
  const dumpFile = `/tmp/e2e-fail-${testID}.xml`;
  fs.writeFileSync(dumpFile, xml);
  console.error(`[wait ${testID}] échec — arbre final écrit dans ${dumpFile}`);
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
  await dumpDebugOnFail(testID);
  throw new Error(`Timeout (${timeoutMs}ms) : testID "${testID}" jamais apparu à l'écran.`);
}

// Inverse de waitForTestID — utilisé pour confirmer la fermeture du drawer (son contenu reste
// monté par défaut par @react-navigation/drawer, translaté hors écran ; on vérifie ici que ses
// nœuds ne sont plus rapportés comme visibles dans l'arbre plutôt que de deviner un délai fixe).
async function waitForTestIDGone(testID, timeoutMs = 10000, pollMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = await dumpTree();
    if (!xml.includes(`resource-id="${testID}"`)) {
      return Date.now() - start;
    }
    await sleep(pollMs);
  }
  await dumpDebugOnFail(`${testID}-gone`);
  throw new Error(`Timeout (${timeoutMs}ms) : testID "${testID}" toujours visible.`);
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

// Comme tapTestID, mais n'appuie qu'une fois les coordonnées confirmées stables sur deux dumps
// consécutifs — utile juste après une saisie clavier, où `uiautomator dump` lui-même masque le
// clavier (effet de bord connu) et redéclenche un resize (adjustResize) de la fenêtre après
// coup : un simple dump-puis-tap risque de viser des coordonnées déjà obsolètes une fois le
// resize terminé. Constaté en pratique sur la modale Filtres (bouton "Appliquer" manqué après
// saisie du budget) : voir run-e2e-search.js.
async function tapTestIDWhenStable(testID, timeoutMs = 10000, pollMs = 200) {
  const start = Date.now();
  let previous = null;
  while (Date.now() - start < timeoutMs) {
    const xml = await dumpTree();
    const center = findNodeCenter(xml, testID);
    if (center) {
      if (previous && previous.x === center.x && previous.y === center.y) {
        // Constaté : un `input tap` enchaîné immédiatement après plusieurs `uiautomator dump`
        // consécutifs (ce qu'on vient de faire, deux fois, pour confirmer la stabilité) peut
        // être silencieusement perdu sous charge (même hôte, même appareil) — un tap manuel
        // isolé aux mêmes coordonnées, quelques secondes plus tard, fonctionne systématiquement
        // à tous les coups. Cette pause laisse le sous-système d'injection d'événements/
        // accessibilité de l'appareil se libérer avant le tap réel.
        await sleep(300);
        if (process.env.E2E_DEBUG) console.error(`[tap-stable ${testID}] center=(${center.x},${center.y})`);
        adb(['shell', 'input', 'tap', String(center.x), String(center.y)]);
        return;
      }
      previous = center;
    } else {
      previous = null;
    }
    await sleep(pollMs);
  }
  throw new Error(`Timeout (${timeoutMs}ms) : le testID "${testID}" n'a jamais atteint une position stable pour taper dessus.`);
}

// Tape sur `tapTestID` jusqu'à ce que `waitTestID` apparaisse — nécessaire pour les triggers
// LocationSelect (province/ville/quartier) : leur bouton reste présent mais passe `disabled`
// tant que la requête de facettes Algolia sous-jacente est en `isLoading` (juste après un choix
// en cascade, qui redéclenche cette requête), donc un tap pile à ce moment-là ne fait rien —
// même défaut constaté côté Jest avec RNTL (voir mémoire feedback-mobile-reuse-pwa-design). Un
// nouveau tap une fois la requête résolue (options chargées, trigger réactivé) rouvre la voie.
async function tapUntilVisible(tapTestID_, waitTestID, timeoutMs = 15000, retryMs = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await tapTestID(tapTestID_, Math.max(1000, timeoutMs - (Date.now() - start)));
    try {
      await waitForTestID(waitTestID, retryMs);
      return;
    } catch {
      // Retente : le trigger était probablement encore `disabled` (requête en cours).
    }
  }
  throw new Error(`Timeout (${timeoutMs}ms) : "${waitTestID}" jamais apparu après taps répétés sur "${tapTestID_}".`);
}

// Inverse de tapUntilVisible : retape tant que `goneTestID` n'a pas disparu — nécessaire pour
// "Appliquer" (voir tapTestIDWhenStable) où un `input tap` enchaîné juste après plusieurs
// `uiautomator dump` peut être silencieusement perdu sous charge (constaté : coordonnées
// correctes confirmées manuellement, mais la modale reste ouverte après le tap du script).
async function tapUntilGone(tapFn, goneTestID, timeoutMs = 15000, retryMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await tapFn();
    try {
      await waitForTestIDGone(goneTestID, retryMs);
      return;
    } catch {
      // Retente : le tap précédent a probablement été perdu.
    }
  }
  throw new Error(`Timeout (${timeoutMs}ms) : "${goneTestID}" toujours présent après taps répétés.`);
}

// Ramène l'app au premier plan SANS la tuer (contrairement à relaunchApp) : `am start` sur une
// activité déjà au premier plan est un no-op ("brought to the front"), et si l'app a été mise en
// arrière-plan entre-temps (un KEYCODE_BACK émis à vide sur ce Samsung agit comme un retour et
// renvoie à l'écran d'accueil) elle est restaurée en < 1 s, sans rechargement du bundle Metro.
async function bringAppToForeground() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  adb(['shell', 'am', 'start', '-n', ACTIVITY]);
  await sleep(800);
}

// true si le clavier logiciel est effectivement affiché — à vérifier avant d'émettre un
// KEYCODE_BACK pour le fermer, sinon le BACK "traverse" et met l'app en arrière-plan.
function isSoftKeyboardShown() {
  try {
    return /mInputShown=true/.test(adb(['shell', 'dumpsys', 'input_method']));
  } catch {
    return false;
  }
}

// Empêche l'écran de s'éteindre / se verrouiller pendant toute la durée d'un run (l'appareil
// est branché en USB pour le débogage adb, donc "stay on while plugged in" reste actif). Un
// écran éteint ou un keyguard rend TOUS les dumps uiautomator inutiles (arbre = launcher /
// écran de verrouillage) et fait échouer la suite entière ; c'était la cause n°1 des runs
// "tout rouge". À restaurer en fin de run via `releaseScreenAwake`.
function keepScreenAwake() {
  try {
    adb(['shell', 'svc', 'power', 'stayon', 'true']);
  } catch {
    // certaines ROM refusent la valeur "true" seule — sans importance, on tente quand même.
  }
}

function releaseScreenAwake() {
  try {
    adb(['shell', 'svc', 'power', 'stayon', 'false']);
  } catch {
    // appareil déconnecté en fin de run — ne pas planter le handler de sortie.
  }
}

async function relaunchApp() {
  adb(['shell', 'am', 'force-stop', PACKAGE]);
  await sleep(500);
  // Filet de sécurité : un cycle force-stop/start répété peut laisser l'écran s'éteindre ou se
  // verrouiller entre deux essais (l'app n'a alors plus le wakelock le temps du redémarrage) ;
  // sans ça, uiautomator ne voit qu'un arbre minimal (écran éteint/verrouillé) indéfiniment.
  adb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  adb(['shell', 'wm', 'dismiss-keyguard']);
  adb(['shell', 'am', 'start', '-n', ACTIVITY]);
}

async function startAppAndDismissLogBox() {
  await relaunchApp();
  // 180s plutôt que 45s : sur l'émulateur (contrairement au téléphone physique, ~35s), le
  // handshake natif du bridge RN (ReactHost.getJSBundleLoader -> isMetroRunning ->
  // loadJSBundleFromMetro -> Loading JS Bundle) prend lui-même 40-90s après un force-stop —
  // Metro sert pourtant le bundle en <200ms (vérifié dans les logs Metro), le coût est donc
  // côté natif/émulateur, pas réseau ni bundling. Le budget a été monté de 120s à 180s après
  // avoir constaté (via HWUI "Davey!" + screencaps) que l'app progresse mais rend chaque frame
  // en 800-1150ms au lieu de 16.6ms quand la machine hôte est chargée (Cursor/tsserver/browser
  // concurrents) — le rendu finit par aboutir, 120s est juste trop court dans ces conditions.
  const startupMs = await waitForTestID('screen-accueil', 180000);
  const dismissed = await dismissLogBoxNoticeIfPresent();
  return { startupMs, dismissed };
}

module.exports = {
  PACKAGE,
  DEVICE,
  argValue,
  adb,
  sleep,
  dumpTree,
  findNodeCenter,
  isNodeSelected,
  countTestID,
  typeText,
  dismissLogBoxNoticeIfPresent,
  waitForTestID,
  waitForTestIDGone,
  tapTestID,
  tapTestIDWhenStable,
  tapUntilVisible,
  tapUntilGone,
  relaunchApp,
  bringAppToForeground,
  isSoftKeyboardShown,
  keepScreenAwake,
  releaseScreenAwake,
  startAppAndDismissLogBox,
};
