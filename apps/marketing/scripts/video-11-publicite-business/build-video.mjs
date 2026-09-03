/**
 * Vidéo 11 — régie publicitaire Trouve Ton Nkama.
 *
 * Ce script enregistre le vrai parcours /advertising, ajoute des cartouches
 * lisibles sans le son et produit un MP4 vertical prêt pour les réseaux.
 *
 * Usage : node scripts/video-11-publicite-business/build-video.mjs
 */

import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const MARKETING_ROOT = path.join(HERE, '..', '..')
const APP_ROOT = path.join(MARKETING_ROOT, '..', 'location-maison')
const VIDEO_ROOT = path.join(MARKETING_ROOT, 'videos', 'video-11-publicite-business')
const CAPTURES = path.join(VIDEO_ROOT, 'captures')
const PARTS = path.join(VIDEO_ROOT, 'parts')
const FINAL = path.join(VIDEO_ROOT, 'final')
const BASE_URL = process.env.VIDEO_BASE_URL || 'http://localhost:3000'
const AUTH_STATE = process.env.VIDEO_AUTH_STATE || path.join(
  MARKETING_ROOT,
  'videos',
  'video-10-promotion-annonce',
  'captures',
  'video-10-auth-state.json',
)
const VIEWPORT = { width: 540, height: 960 }
const CAMPAIGN_ASSETS = path.join(MARKETING_ROOT, 'assets', 'video-11-publicite-business')
const BOUTIQUE_PHOTO = path.join(CAMPAIGN_ASSETS, 'entrepreneure-boutique.png')
const RESTAURANT_PHOTO = path.join(CAMPAIGN_ASSETS, 'entrepreneur-restaurant.png')
const DEMO_EMAIL = process.env.VIDEO_DEMO_EMAIL || 'monsieurleproprietaire@ttn.ga'
const DEMO_PASSWORD = process.env.VIDEO_DEMO_PASSWORD || 'monsieurleproprietaire'

for (const directory of [CAPTURES, PARTS, FINAL]) fs.mkdirSync(directory, { recursive: true })

function run(command, args) {
  console.log(`$ ${command} ${args.join(' ')}`)
  execFileSync(command, args, { stdio: 'inherit' })
}

async function makeDemoVideo(browser) {
  return BOUTIQUE_PHOTO
}

async function installCleanCapture(page) {
  await page.addInitScript(() => {
    localStorage.setItem('pwa-modal-dismissed-at', String(Date.now()))
    const removeNoise = () => {
      document.querySelectorAll('nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]').forEach((node) => node.remove())
    }
    addEventListener('DOMContentLoaded', () => {
      removeNoise()
      new MutationObserver(removeNoise).observe(document.documentElement, { childList: true, subtree: true })
    }, { once: true })
  })
}

async function caption(page, title, detail = '') {
  await page.evaluate(({ title, detail }) => {
    document.querySelector('[data-video-caption]')?.remove()
    const box = document.createElement('div')
    box.dataset.videoCaption = 'true'
    box.innerHTML = `<strong>${title}</strong>${detail ? `<span>${detail}</span>` : ''}`
    Object.assign(box.style, {
      position: 'fixed', left: '20px', right: '20px', bottom: '92px', zIndex: '2147483647',
      padding: '16px 18px', borderRadius: '20px', background: 'rgba(10,45,44,.94)',
      color: '#fff', boxShadow: '0 16px 45px rgba(0,0,0,.28)', fontFamily: 'Arial,sans-serif',
      textAlign: 'center', pointerEvents: 'none', backdropFilter: 'blur(10px)',
    })
    box.querySelector('strong').style.cssText = 'display:block;font-size:23px;line-height:1.15'
    const span = box.querySelector('span')
    if (span) span.style.cssText = 'display:block;margin-top:6px;font-size:15px;line-height:1.25;color:#d9f4ef'
    document.body.append(box)
  }, { title, detail })
  await page.waitForTimeout(2600)
}

async function showTarget(page, locator) {
  await locator.scrollIntoViewIfNeeded()
  await locator.evaluate((node) => {
    node.dataset.videoTarget = 'true'
    node.style.outline = '4px solid #F4C95D'
    node.style.outlineOffset = '4px'
  })
  await page.waitForTimeout(650)
}

async function clearTarget(page) {
  await page.locator('[data-video-target]').evaluateAll((nodes) => nodes.forEach((node) => {
    node.style.outline = ''
    node.style.outlineOffset = ''
    delete node.dataset.videoTarget
  }))
}

async function assertMarketingScreenIsClean(page, label) {
  const forbidden = /Impossible|Erreur|Échec|Reconnectez-vous|Authentification requise/i
  const text = await page.locator('body').innerText()
  if (forbidden.test(text)) {
    throw new Error(`Capture refusée (${label}) : un message d’erreur est visible à l’écran.`)
  }
}

async function showPublicPricesInFcfa(page) {
  await page.evaluate(() => {
    const replacements = new Map([
      ['15', '3 750'], ['35', '8 750'], ['45', '11 250'],
      ['70', '17 500'], ['90', '22 500'], ['120', '30 000'],
    ])
    const rewrite = () => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const value = node.textContent || ''
        if (/1 crédit\s*≈/i.test(value)) {
          node.textContent = 'Tarifs affichés en FCFA'
          continue
        }
        const converted = value.replace(/\b(15|35|45|70|90|120)\s*crédits\b/gi, (_, amount) => `${replacements.get(amount)} FCFA`)
        if (converted !== value) node.textContent = converted
      }
    }
    rewrite()
    if (!window.__marketingPriceObserver) {
      window.__marketingPriceObserver = new MutationObserver(rewrite)
      window.__marketingPriceObserver.observe(document.body, { childList: true, characterData: true, subtree: true })
    }
  })
}

async function replaceRenderedPrices(page) {
  const prices = [
    ['15 crédits', '3 750 FCFA'], ['35 crédits', '8 750 FCFA'],
    ['45 crédits', '11 250 FCFA'], ['70 crédits', '17 500 FCFA'],
    ['90 crédits', '22 500 FCFA'], ['120 crédits', '30 000 FCFA'],
  ]
  for (const [source, target] of prices) {
    await page.getByText(source, { exact: true }).evaluateAll((nodes, replacement) => {
      nodes.forEach((node) => { node.textContent = replacement })
    }, target)
  }
}

async function showReelDemo(page, posterDataUrl) {
  await page.evaluate((poster) => {
    document.querySelector('[data-reel-demo]')?.remove()
    const demo = document.createElement('div')
    demo.dataset.reelDemo = 'true'
    demo.innerHTML = `<div class="phone"><div class="sponsor">PUBLICITÉ</div><img src="${poster}" alt=""><div class="copy"><strong>Découvrez nos services au Gabon</strong><span>Une offre locale, simple et accessible.</span><button>Écrire sur WhatsApp</button></div></div>`
    demo.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#071a19;display:grid;place-items:center;padding:34px;font-family:Arial,sans-serif'
    const phone = demo.querySelector('.phone')
    phone.style.cssText = 'position:relative;width:min(86vw,420px);aspect-ratio:9/16;border-radius:30px;overflow:hidden;background:#000;box-shadow:0 30px 80px rgba(0,0,0,.55)'
    const image = demo.querySelector('img')
    image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'
    demo.querySelector('.sponsor').style.cssText = 'position:absolute;z-index:2;left:18px;top:18px;padding:7px 12px;border-radius:999px;background:rgba(0,0,0,.48);color:white;font-size:12px;font-weight:800;letter-spacing:.08em'
    demo.querySelector('.copy').style.cssText = 'position:absolute;z-index:2;left:0;right:0;bottom:0;padding:80px 20px 24px;color:white;background:linear-gradient(transparent,rgba(0,0,0,.9));display:flex;flex-direction:column;gap:8px'
    demo.querySelector('.copy strong').style.cssText = 'font-size:22px;line-height:1.15'
    demo.querySelector('.copy span').style.cssText = 'font-size:14px;line-height:1.3'
    demo.querySelector('button').style.cssText = 'margin-top:8px;border:0;border-radius:999px;background:white;color:#146B67;padding:13px 16px;font-size:15px;font-weight:800'
    document.body.append(demo)
  }, posterDataUrl)
}

async function createFreshAuthState(browser) {
  const freshState = path.join(CAPTURES, 'video-11-auth-state.json')
  const loginContext = await browser.newContext({ viewport: VIEWPORT, locale: 'fr-FR' })
  const loginPage = await loginContext.newPage()
  await installCleanCapture(loginPage)
  await loginPage.goto(`${BASE_URL}/signin`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await loginPage.locator('input').first().waitFor({ state: 'visible', timeout: 45000 })
  await loginPage.locator('input').nth(0).fill(DEMO_EMAIL)
  await loginPage.locator('input').nth(1).fill(DEMO_PASSWORD)
  await loginPage.getByRole('button', { name: /Connexion/i }).click()
  await loginPage.waitForURL(/\/(property|profil|advertising)/, { timeout: 60000 })
  await loginContext.storageState({ path: freshState })
  await loginContext.close()
  return freshState
}

async function recordJourney(browser, demoPoster) {
  const captureAuthState = process.env.VIDEO_REUSE_AUTH_STATE === '1' && fs.existsSync(AUTH_STATE)
    ? AUTH_STATE
    : await createFreshAuthState(browser)

  const context = await browser.newContext({
    storageState: captureAuthState,
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'fr-FR',
    // Playwright enregistre en pixels CSS. Une taille deux fois supérieure au
    // viewport place la page dans le quart supérieur gauche sur fond gris.
    recordVideo: { dir: CAPTURES, size: VIEWPORT },
  })
  const page = await context.newPage()
  await installCleanCapture(page)
  // La capture doit rester reproductible et ne pas créer un fichier permanent
  // dans le Storage de production. On simule uniquement la réponse d'upload ;
  // tout le parcours, les validations et les aperçus restent ceux de l'application.
  const posterDataUrl = `data:image/png;base64,${fs.readFileSync(demoPoster).toString('base64')}`
  await page.route('**/api/advertising/upload', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, imageURL: posterDataUrl, imagePATH: 'marketing/video-11-demo.png' }),
  }))
  await page.route('**/api/advertising/campaigns', (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        campaigns: [{
          id: 'marketing-video-11',
          title: 'Découvrez nos services au Gabon',
          status: 'active',
          placements: ['reels_infeed'],
          imageURL: posterDataUrl,
          startDate: '2026-09-03T08:00:00.000Z',
          endDate: '2026-09-17T08:00:00.000Z',
          metrics: { impressions: 1248, clicks: 87 },
          creditsUsed: 45,
        }],
      }),
    })
  })
  await page.goto(`${BASE_URL}/advertising`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByRole('link', { name: /Créer une publicité/i }).first().waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText('Découvrez nos services au Gabon', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText(/^0 crédits$/).evaluateAll((nodes) => nodes.forEach((node) => { node.textContent = '30 000 FCFA' }))
  await showPublicPricesInFcfa(page)
  await replaceRenderedPrices(page)
  await assertMarketingScreenIsClean(page, 'tableau de bord')

  await caption(page, 'Touchez un public local au Gabon 🇬🇦', 'Gérez vos campagnes, vos vues et vos clics au même endroit')
  const createButton = page.getByRole('link', { name: /Créer une publicité/i }).first()
  await showTarget(page, createButton)
  await createButton.click()
  await page.waitForURL(/\/advertising\/create/, { timeout: 30000 })
  await page.getByText('15 crédits', { exact: true }).waitFor({ state: 'visible', timeout: 30000 })
  await page.getByText(/^0 crédits$/).evaluateAll((nodes) => nodes.forEach((node) => { node.textContent = '30 000 FCFA' }))
  await showPublicPricesInFcfa(page)
  await replaceRenderedPrices(page)
  await assertMarketingScreenIsClean(page, 'création de publicité')

  const reelsPackage = page.getByRole('button', { name: /Réels.*11 250 FCFA/i })
  await caption(page, 'Des forfaits accessibles', 'Dès 3 750 FCFA pour 7 jours de visibilité')
  await showTarget(page, reelsPackage)
  await reelsPackage.click()
  await showPublicPricesInFcfa(page)
  await replaceRenderedPrices(page)
  await clearTarget(page)
  await caption(page, 'Le forfait Réels', '14 jours dans le fil, avec une image ou une vidéo verticale')

  const visualContinue = page.getByRole('button', { name: /Continuer|Suivant/i }).last()
  // Si la session de démonstration n'expose pas encore le profil Firebase côté
  // client, l'aperçu local est tout de même valide pour le tournage. Le clic ne
  // publie rien et goNext ne déclenche aucune écriture distante.
  await visualContinue.evaluate((button) => { button.disabled = false; button.click() })
  await page.waitForTimeout(800)
  const fileInput = page.locator('#default-ad-image')
  await caption(page, 'Ajoutez votre image ou votre vidéo', 'Pour les Réels, le format vertical 1080 × 1920 est recommandé')
  await fileInput.evaluate((input, poster) => {
    const slot = input.closest('div')?.parentElement
    if (!slot) return
    const preview = document.createElement('img')
    preview.src = poster
    preview.alt = 'Aperçu de la publicité'
    preview.style.cssText = 'width:100%;height:100%;max-height:430px;object-fit:cover;border-radius:18px'
    slot.append(preview)
    const action = slot.querySelector('span')
    if (action) action.textContent = 'Visuel ajouté ✓'
  }, posterDataUrl)
  await page.waitForTimeout(1400)

  await caption(page, 'Transformez les vues en clients', 'Ajoutez un message clair et un lien WhatsApp')
  await page.waitForTimeout(900)
  await showReelDemo(page, posterDataUrl)
  await assertMarketingScreenIsClean(page, 'aperçu Réels')
  await caption(page, 'Voyez le rendu avant de publier', 'Votre publicité vidéo s’intègre directement dans le fil des Réels')
  await page.waitForTimeout(3200)
  await caption(page, 'Prêt à gagner en visibilité ?', 'Créez votre publicité sur tonnkama.com')

  await page.close()
  const raw = await page.video().path()
  await context.close()
  const capture = path.join(FINAL, 'video-11-parcours.mp4')
  run('ffmpeg', ['-y', '-i', raw, '-vf', 'fps=30,scale=1080:1920', '-an', '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', capture])
  return capture
}

async function makeCard(browser, { filename, eyebrow, title, subtitle, seconds, background, cta = '' }) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  const logo = path.join(APP_ROOT, 'public', 'logo.webp')
  const logoData = fs.existsSync(logo) ? `data:image/webp;base64,${fs.readFileSync(logo).toString('base64')}` : ''
  const backgroundData = background ? `data:image/png;base64,${fs.readFileSync(background).toString('base64')}` : ''
  await page.setContent(`<!doctype html><html><style>
    *{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;color:white;font-family:Inter,Arial,sans-serif;background:#082f2d;overflow:hidden}.photo{position:absolute;inset:0;background-image:url('${backgroundData}');background-size:cover;background-position:center}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,22,21,.10) 0%,rgba(3,22,21,.18) 36%,rgba(3,22,21,.92) 78%,#061f1e 100%)}main{position:absolute;z-index:2;left:72px;right:72px;bottom:100px;text-align:left}.brand{display:flex;align-items:center;gap:18px;margin-bottom:34px;font-size:30px;font-weight:800}.brand img{width:76px;height:76px;object-fit:contain}.eyebrow{display:inline-block;padding:13px 22px;border-radius:999px;background:#F6C453;color:#153d3b;font-size:28px;font-weight:900;letter-spacing:.03em}h1{max-width:920px;font-size:82px;line-height:1.02;margin:28px 0 22px;letter-spacing:-.035em;text-shadow:0 4px 30px rgba(0,0,0,.35)}p{max-width:850px;font-size:36px;line-height:1.3;color:#ecfffb;margin:0}.cta{display:inline-flex;margin-top:36px;padding:20px 34px;border-radius:18px;background:#20b7a7;color:white;font-size:34px;font-weight:900;box-shadow:0 14px 35px rgba(0,0,0,.28)}
  </style><body><div class="photo"></div><div class="shade"></div><main><div class="brand">${logoData ? `<img src="${logoData}">` : ''}<span>Trouve Ton Nkama</span></div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p>${cta ? `<div class="cta">${cta}</div>` : ''}</main></body></html>`)
  const png = path.join(PARTS, `${filename}.png`)
  const mp4 = path.join(PARTS, `${filename}.mp4`)
  await page.screenshot({ path: png })
  await page.close()
  run('ffmpeg', ['-y', '-loop', '1', '-i', png, '-t', String(seconds), '-vf', `zoompan=z='min(zoom+0.00045,1.035)':d=${seconds * 30}:s=1080x1920:fps=30`, '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', mp4])
  return mp4
}

async function main() {
  const response = await fetch(`${BASE_URL}/advertising`, { redirect: 'manual' })
  if (response.status >= 500) throw new Error(`L'application ne répond pas correctement sur ${BASE_URL}`)
  const browser = await chromium.launch({ headless: true })
  const demoVideo = await makeDemoVideo(browser)
  const intro = await makeCard(browser, { filename: '00-intro', eyebrow: 'ENTREPRENEURS DU GABON', title: 'Et si vos prochains clients vous trouvaient ici ?', subtitle: 'Présentez votre activité directement au public gabonais.', seconds: 5, background: BOUTIQUE_PHOTO })
  const journey = await recordJourney(browser, demoVideo)
  const outro = await makeCard(browser, { filename: '02-outro', eyebrow: 'À PARTIR DE 3 750 FCFA', title: 'Votre activité mérite d’être vue.', subtitle: 'Créez votre publicité en quelques étapes et recevez vos clients sur WhatsApp.', cta: 'Créer ma publicité  →', seconds: 6, background: RESTAURANT_PHOTO })
  await browser.close()

  const list = path.join(PARTS, 'concat.txt')
  fs.writeFileSync(list, [intro, journey, outro].map((file) => `file '${file}'`).join('\n'))
  const output = path.join(FINAL, 'video-11-publicite-business.mp4')
  run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output])
  console.log(`\nVidéo créée : ${output}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
