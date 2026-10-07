#!/usr/bin/env node
/**
 * Parcours E2E Android de publication mobile.
 *
 * Ce runner valide les trois formulaires en conditions réelles (navigation, catégories,
 * champs et garde-fous) sans envoyer de données en production. Les créations complètes et
 * leurs branches succès/échec sont couvertes par Jest avec les frontières réseau/Storage
 * mockées. Quand un environnement Firebase E2E isolé sera disponible, le mode persistant
 * devra créer exactement 1 objet, le réutiliser, puis le supprimer dans un `finally`.
 */
const {
  DEVICE, PACKAGE, adb, sleep, waitForTestID, waitForTestIDGone, tapTestID, tapTestIDWhenStable,
  bringAppToForeground, dismissLogBoxNoticeIfPresent, dumpTree, typeText,
  startAppAndDismissLogBox,
} = require('./lib');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const AUTH_HELPER = path.resolve(__dirname, '../../location-maison/scripts/mobile-e2e-auth-user.js');

function runAuthHelper(action, uid) {
  const output = execFileSync(process.execPath, [AUTH_HELPER, action, ...(uid ? [uid] : [])], {
    env: { ...process.env, MOBILE_E2E_CONFIRM_REAL_DEV: '1' },
    encoding: 'utf8',
  }).trim();
  return JSON.parse(output.split('\n').at(-1));
}

async function ensureAuthenticated(credentials) {
  await bringAppToForeground();
  await dismissLogBoxNoticeIfPresent();
  const xml = await dumpTree();
  if (!xml.includes('resource-id="screen-connexion"')) return;
  await tapTestID('signin-email');
  typeText(credentials.email);
  await tapTestID('signin-password');
  typeText(credentials.password);
  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await tapTestID('signin-submit');
  await waitForTestIDGone('screen-connexion', 30000);
}

async function openPublishHome() {
  // L'onglet Publier garde son état de navigation interne d'une exécution à l'autre
  // (un simple `bringAppToForeground` ne fait qu'un `am start`, pas de force-stop) : si une
  // exécution précédente — ou une exploration manuelle — s'est arrêtée plus loin dans la pile
  // (catégorie, formulaire...), taper l'onglet ne fait que lui redonner le focus sans la
  // réinitialiser. Un relaunch complet (force-stop + start, déjà établi ailleurs dans ce
  // fichier lib.js) garantit de repartir d'un état connu — contrairement à une série de BACK
  // bornée, qui a pu, en pratique, remonter plus haut que prévu et faire sortir l'app
  // complètement (jusqu'au launcher Android, constaté lors de l'audit de ce script).
  await startAppAndDismissLogBox();
  // tapTestIDWhenStable (pas tapTestID) : juste après startAppAndDismissLogBox, qui vient
  // lui-même d'enchaîner plusieurs `uiautomator dump`, un tap immédiat peut être silencieusement
  // perdu sous charge (constaté ici et déjà documenté pour ce même symptôme ailleurs dans ce
  // fichier) — tapTestIDWhenStable attend deux lectures de coordonnées identiques avant de taper.
  await tapTestIDWhenStable('tab-publier');
  await waitForTestID('screen-publier', 20000);
}

async function backTo(testID) {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  await waitForTestID(testID, 15000);
}

async function scrollDown() {
  adb(['shell', 'input', 'swipe', '640', '2200', '640', '700', '500']);
  await sleep(700);
}

async function waitForText(text, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = await require('./lib').dumpTree();
    if (xml.includes(text)) return;
    await sleep(300);
  }
  throw new Error(`Texte attendu absent après ${timeoutMs}ms : ${text}`);
}

async function testRealEstate() {
  await tapTestID('publish-choice-listing');
  await waitForTestID('screen-publish-category', 20000);
  await tapTestID('publish-category-immobilier');
  await waitForTestID('screen-create-listing', 15000);
  await scrollDown();
  await scrollDown();
  await tapTestID('listing-submit');
  await waitForText("Complète d'abord");
  await backTo('screen-publish-category');
  await backTo('screen-publier');
}

async function testMode() {
  await tapTestID('publish-choice-listing');
  await waitForTestID('screen-publish-category', 20000);
  await tapTestID('publish-category-mode');
  await waitForTestID('screen-create-listing', 15000);
  await tapTestID('listing-submit');
  await waitForText("Complète d'abord");
  await backTo('screen-publish-category');
  await backTo('screen-publier');
}

async function testReel() {
  await tapTestID('publish-choice-reel');
  await waitForTestID('screen-create-reel', 15000);
  await waitForTestID('reel-video-picker', 10000);
  await scrollDown();
  await waitForTestID('reel-submit', 10000);
  await backTo('screen-publier');
}

async function main() {
  console.log(`Appareil : ${DEVICE} — Package : ${PACKAGE}`);
  const results = [];
  const credentials = runAuthHelper('setup');
  try {
    await ensureAuthenticated(credentials);
    await openPublishHome();
    for (const [name, test] of [
      ['Annonce immobilière', testRealEstate],
      ['Annonce Mode', testMode],
      ['Réel', testReel],
    ]) {
      process.stdout.write(`▶ ${name} ... `);
      try {
        await test();
        results.push({ name, ok: true });
        console.log('OK');
      } catch (error) {
        results.push({ name, ok: false, error: error.message });
        console.log(`ÉCHEC — ${error.message}`);
        try { await openPublishHome(); } catch {}
      }
    }
  } finally {
    runAuthHelper('cleanup', credentials.uid);
  }
  console.log('\n=== Résumé publication mobile ===');
  for (const result of results) console.log(`${result.ok ? '✓' : '✗'} ${result.name}${result.ok ? '' : ` — ${result.error}`}`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
