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
  DEVICE, PACKAGE, adb, sleep, waitForTestID, waitForTestIDGone, tapTestID,
  bringAppToForeground, dismissLogBoxNoticeIfPresent,
} = require('./lib');

async function openPublishHome() {
  await bringAppToForeground();
  await dismissLogBoxNoticeIfPresent();
  if (!(await require('./lib').dumpTree()).includes('resource-id="screen-publier"')) {
    await tapTestID('tab-publier');
  }
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
  console.log('\n=== Résumé publication mobile ===');
  for (const result of results) console.log(`${result.ok ? '✓' : '✗'} ${result.name}${result.ok ? '' : ` — ${result.error}`}`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
