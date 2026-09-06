/**
 * Vidéo 12 — demandes de recherche.
 * Capture la vraie page publique avec une demande de démonstration locale,
 * sans écrire en base ni révéler un numéro de téléphone.
 */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MARKETING_ROOT = path.join(HERE, '..', '..')
const APP_ROOT = path.join(MARKETING_ROOT, '..', 'location-maison')
const VIDEO_ROOT = path.join(MARKETING_ROOT, 'videos', 'video-12-demandes-recherche')
const CAPTURES = path.join(VIDEO_ROOT, 'captures')
const PARTS = path.join(VIDEO_ROOT, 'parts')
const FINAL = path.join(VIDEO_ROOT, 'final')
const ASSET_ROOT = path.join(MARKETING_ROOT, 'assets', 'video-12-demandes-recherche')
const OWNER_PHOTO = path.join(ASSET_ROOT, 'proprietaire-maison.png')
const BASE_URL = process.env.VIDEO_BASE_URL || 'http://localhost:3000'
const VIEWPORT = { width: 540, height: 960 }

for (const directory of [CAPTURES, PARTS, FINAL]) fs.mkdirSync(directory, { recursive: true })

function run(command, args, capture = false) {
  return execFileSync(command, args, {
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf8' : undefined,
  })
}

async function installCleanCapture(page) {
  await page.addInitScript(() => {
    localStorage.setItem('pwa-modal-dismissed-at', String(Date.now()))
    const clean = () => document
      .querySelectorAll('nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]')
      .forEach((node) => node.remove())
    addEventListener('DOMContentLoaded', () => {
      clean()
      new MutationObserver(clean).observe(document.documentElement, { childList: true, subtree: true })
    }, { once: true })
  })
}

async function caption(page, title, detail = '', milliseconds = 2600) {
  await page.evaluate(({ title, detail }) => {
    document.querySelector('[data-video-caption]')?.remove()
    const box = document.createElement('div')
    box.dataset.videoCaption = 'true'
    box.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}`
    box.style.cssText = 'position:fixed;left:20px;right:20px;bottom:96px;z-index:2147483647;padding:16px 18px;border-radius:20px;background:rgba(7,47,45,.95);color:#fff;box-shadow:0 16px 45px rgba(0,0,0,.28);font-family:Arial,sans-serif;text-align:center;pointer-events:none;backdrop-filter:blur(10px)'
    box.querySelector('strong').style.cssText = 'display:block;font-size:23px;line-height:1.15'
    const span = box.querySelector('span')
    if (span) span.style.cssText = 'display:block;margin-top:6px;font-size:15px;line-height:1.25;color:#d9f4ef'
    document.body.append(box)
  }, { title, detail })
  await page.waitForTimeout(milliseconds)
}

async function highlight(page, selector) {
  await page.locator(selector).evaluate((node) => {
    node.dataset.videoTarget = 'true'
    node.style.outline = '4px solid #F4C95D'
    node.style.outlineOffset = '4px'
  })
}

async function clearHighlight(page) {
  await page.locator('[data-video-target]').evaluateAll((nodes) => nodes.forEach((node) => {
    node.style.outline = ''
    node.style.outlineOffset = ''
    delete node.dataset.videoTarget
  }))
}

async function injectDemoRequest(page) {
  await page.locator('a[href^="https://wa.me/"]').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.evaluate(() => {
    const contact = document.querySelector('a[href^="https://wa.me/"]')
    const card = contact?.closest('.rounded-2xl')
    if (!card) throw new Error('Carte de demande introuvable')
    card.dataset.demoRequest = 'true'
    const badge = card.querySelector('span')
    const paragraphs = card.querySelectorAll('p')
    if (badge) badge.textContent = 'Maison'
    if (paragraphs[0]) paragraphs[0].textContent = 'Cherche à louer — Libreville, Nzeng-Ayong'
    if (paragraphs[1]) paragraphs[1].textContent = 'Estuaire'
    if (paragraphs[2]) {
      paragraphs[2].textContent = 'Budget : 0 - 150 000 FCFA'
      paragraphs[2].dataset.demoBudget = 'true'
    }
    if (paragraphs[3]) paragraphs[3].textContent = 'Recherche une maison propre et accessible, disponible rapidement.'
    contact.removeAttribute('href')
    contact.dataset.demoContact = 'true'
    contact.style.cursor = 'default'
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
      if (link !== contact) link.closest('.rounded-2xl')?.remove()
    })
    card.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(800)
}

async function showMatchOverlay(page) {
  await page.evaluate(() => {
    const overlay = document.createElement('div')
    overlay.dataset.matchOverlay = 'true'
    overlay.innerHTML = '<div class="home">Votre maison<br><strong>140 000 FCFA / mois</strong></div><div class="equals">✓</div><div class="request">Budget recherché<br><strong>0 – 150 000 FCFA</strong></div>'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:linear-gradient(160deg,#073b38,#0f766e);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:44px;color:white;font-family:Arial,sans-serif;text-align:center'
    overlay.querySelectorAll('.home,.request').forEach((node) => { node.style.cssText = 'width:100%;padding:30px 24px;border-radius:26px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.24);font-size:24px;line-height:1.35' })
    overlay.querySelectorAll('strong').forEach((node) => { node.style.cssText = 'display:block;margin-top:8px;font-size:36px;color:#fff' })
    overlay.querySelector('.equals').style.cssText = 'display:grid;place-items:center;width:82px;height:82px;border-radius:50%;background:#F4C95D;color:#153d3b;font-size:46px;font-weight:900'
    document.body.append(overlay)
  })
}

async function showContactOverlay(page) {
  await page.evaluate(() => {
    document.querySelector('[data-match-overlay]')?.remove()
    const overlay = document.createElement('div')
    overlay.dataset.contactOverlay = 'true'
    overlay.innerHTML = '<div class="phone"><div class="top">WhatsApp</div><div class="bubble">Bonjour, j’ai vu votre demande sur Trouve Ton Nkama. J’ai une maison à 140 000 FCFA qui pourrait vous convenir.</div><div class="status">Contact direct avec le futur locataire</div></div>'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#eaf9f6;display:grid;place-items:center;padding:38px;font-family:Arial,sans-serif'
    overlay.querySelector('.phone').style.cssText = 'width:100%;padding:0 0 28px;border-radius:32px;overflow:hidden;background:#efeae2;box-shadow:0 30px 80px rgba(7,47,45,.26)'
    overlay.querySelector('.top').style.cssText = 'padding:24px;background:#087f5b;color:white;font-size:25px;font-weight:800'
    overlay.querySelector('.bubble').style.cssText = 'margin:42px 22px 24px;padding:20px;border-radius:20px 20px 4px 20px;background:#d9fdd3;color:#173c39;font-size:21px;line-height:1.4;box-shadow:0 5px 18px rgba(0,0,0,.08)'
    overlay.querySelector('.status').style.cssText = 'margin:0 22px;padding:14px;border-radius:999px;background:white;color:#087f5b;text-align:center;font-size:17px;font-weight:800'
    document.body.append(overlay)
  })
}

async function recordJourney(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    recordVideo: { dir: CAPTURES, size: VIEWPORT },
  })
  const page = await context.newPage()
  await installCleanCapture(page)
  await page.goto(`${BASE_URL}/demandes-recherche`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await injectDemoRequest(page)

  const forbidden = /Impossible|Erreur|Échec|Reconnectez-vous|Authentification requise/i
  if (forbidden.test(await page.locator('body').innerText())) {
    throw new Error('Capture refusée : un message d’erreur est visible.')
  }

  await caption(page, 'Vous avez un logement à louer ?', 'Votre futur locataire vous cherche peut-être déjà.', 3000)
  await highlight(page, '[data-demo-request]')
  await caption(page, 'Consultez les demandes actuelles', 'Type de bien, quartier et budget sont affichés clairement.', 3100)
  await clearHighlight(page)
  await highlight(page, '[data-demo-budget]')
  await caption(page, 'Votre loyer : 140 000 FCFA', 'La personne recherche jusqu’à 150 000 FCFA : votre bien correspond.', 3300)
  await clearHighlight(page)
  await showMatchOverlay(page)
  await caption(page, 'Un budget compatible', 'Vous savez immédiatement que votre logement peut convenir.', 2800)
  await showContactOverlay(page)
  await caption(page, 'Contactez-la directement sur WhatsApp', 'Aucun numéro personnel n’est montré dans cette démonstration.', 3600)

  const recordedVideo = page.video()
  await page.close()
  await context.close()
  const raw = await recordedVideo.path()
  const capture = path.join(FINAL, 'video-12-parcours.mp4')
  run('ffmpeg', ['-y', '-i', raw, '-vf', 'fps=30,scale=1080:1920', '-an', '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', capture])
  return capture
}

async function makeCard(browser, { filename, eyebrow, title, subtitle, cta = '', seconds, position = 'center' }) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  const logo = path.join(APP_ROOT, 'public', 'logo.webp')
  const logoData = fs.existsSync(logo) ? `data:image/webp;base64,${fs.readFileSync(logo).toString('base64')}` : ''
  const photoData = `data:image/png;base64,${fs.readFileSync(OWNER_PHOTO).toString('base64')}`
  await page.setContent(`<!doctype html><html><style>*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;color:white;font-family:Inter,Arial,sans-serif;background:#082f2d;overflow:hidden}.photo{position:absolute;inset:0;background:url('${photoData}') ${position}/cover no-repeat}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,22,21,.08),rgba(3,22,21,.14) 38%,rgba(3,22,21,.95) 79%,#061f1e)}main{position:absolute;z-index:2;left:72px;right:72px;bottom:105px}.brand{display:flex;align-items:center;gap:18px;margin-bottom:34px;font-size:30px;font-weight:800}.brand img{width:76px;height:76px;object-fit:contain}.eyebrow{display:inline-block;padding:13px 22px;border-radius:999px;background:#F4C95D;color:#153d3b;font-size:27px;font-weight:900;letter-spacing:.03em}h1{max-width:920px;font-size:78px;line-height:1.03;margin:28px 0 22px;letter-spacing:-.035em;text-shadow:0 4px 30px rgba(0,0,0,.35)}p{max-width:880px;font-size:35px;line-height:1.32;color:#edfffb;margin:0}.cta{display:inline-flex;margin-top:34px;padding:20px 30px;border-radius:18px;background:#20b7a7;color:white;font-size:31px;font-weight:900;box-shadow:0 14px 35px rgba(0,0,0,.28)}</style><body><div class="photo"></div><div class="shade"></div><main><div class="brand">${logoData ? `<img src="${logoData}">` : ''}<span>Trouve Ton Nkama</span></div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p>${cta ? `<div class="cta">${cta}</div>` : ''}</main></body></html>`)
  const png = path.join(PARTS, `${filename}.png`)
  const mp4 = path.join(PARTS, `${filename}.mp4`)
  await page.screenshot({ path: png })
  await page.close()
  run('ffmpeg', ['-y', '-loop', '1', '-i', png, '-t', String(seconds), '-vf', `zoompan=z='min(zoom+0.00045,1.035)':d=${seconds * 30}:s=1080x1920:fps=30`, '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', mp4])
  return mp4
}

async function main() {
  if (!fs.existsSync(OWNER_PHOTO)) throw new Error(`Image manquante : ${OWNER_PHOTO}`)
  const response = await fetch(`${BASE_URL}/demandes-recherche`)
  if (!response.ok) throw new Error(`La page ne répond pas correctement sur ${BASE_URL}`)
  const browser = await chromium.launch({ headless: true })
  const intro = await makeCard(browser, {
    filename: '00-intro', eyebrow: 'PROPRIÉTAIRES AU GABON',
    title: 'Votre futur locataire vous cherche peut-être déjà.',
    subtitle: 'Découvrez gratuitement les besoins publiés sur Trouve Ton Nkama.',
    seconds: 5,
  })
  const journey = await recordJourney(browser)
  const outro = await makeCard(browser, {
    filename: '02-outro', eyebrow: 'CONTACT DIRECT',
    title: 'Ne cherchez plus votre locataire au hasard.',
    subtitle: 'Trouvez une demande compatible et échangez directement sur WhatsApp.',
    cta: 'tonnkama.com/demandes-recherche', seconds: 6, position: '58% center',
  })
  await browser.close()
  const list = path.join(PARTS, 'concat.txt')
  fs.writeFileSync(list, [intro, journey, outro].map((file) => `file '${file}'`).join('\n'))
  const output = path.join(FINAL, 'video-12-demandes-recherche.mp4')
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output])
  console.log(`Vidéo sans voix créée : ${output}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
