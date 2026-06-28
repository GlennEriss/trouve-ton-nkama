/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_SCREENSHOT = path.join(
  ROOT_DIR,
  'public/assets/ads/sources/occazgabon-site-home.png',
);
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/assets/ads/generated');

const FONT = 'Avenir Next, Helvetica Neue, Arial, sans-serif';

function ensureSource() {
  if (!fs.existsSync(SOURCE_SCREENSHOT)) {
    throw new Error(`Capture occazGabon introuvable: ${SOURCE_SCREENSHOT}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function textBlock(lines) {
  return lines.join('\n');
}

async function roundedScreenshot(width, height) {
  const image = await sharp(SOURCE_SCREENSHOT)
    .extract({ left: 92, top: 74, width: 1160, height: 650 })
    .resize(width, height, { fit: 'contain', background: '#FFFFFF' })
    .png()
    .toBuffer();

  const mask = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="28" fill="#fff"/>
    </svg>
  `);

  return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

function shellSvg({ width, height, variant }) {
  const isHome = variant === 'home';
  const isDetail = variant === 'detail';
  const contentX = isDetail ? 68 : 70;
  const brandY = isDetail ? 65 : 78;
  const headlineY = isDetail ? 118 : 148;
  const headlineSize = isDetail ? 36 : isHome ? 44 : 42;
  const bodyY = isDetail ? 186 : 224;
  const bodySize = isDetail ? 20 : 21;
  const ctaY = isDetail ? 222 : isHome ? 280 : 285;
  const panelWidth = isDetail ? 700 : isHome ? 592 : 650;
  const screenshotX = isDetail ? 806 : isHome ? 684 : 736;
  const screenshotY = isDetail ? 52 : isHome ? 52 : 54;
  const screenshotW = isDetail ? 320 : isHome ? 460 : 386;
  const screenshotH = isDetail ? 196 : isHome ? 296 : 234;

  return textBlock([
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <defs>',
    '    <filter id="cardShadow" x="-10%" y="-15%" width="120%" height="130%">',
    '      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0B2726" flood-opacity="0.18"/>',
    '    </filter>',
    '    <filter id="imageShadow" x="-14%" y="-18%" width="128%" height="136%">',
    '      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0B2726" flood-opacity="0.16"/>',
    '    </filter>',
    '  </defs>',
    '  <rect width="100%" height="100%" fill="#F3F7F5"/>',
    `  <rect x="30" y="${isDetail ? 26 : 30}" width="${width - 60}" height="${height - (isDetail ? 52 : 60)}" rx="28" fill="#FFFFFF" filter="url(#cardShadow)"/>`,
    `  <rect x="30" y="${isDetail ? 26 : 30}" width="${panelWidth}" height="${height - (isDetail ? 52 : 60)}" rx="28" fill="#073F3C"/>`,
    `  <path d="M${panelWidth + 30} ${isDetail ? 26 : 30} H${width - 58} C${width - 42} ${isDetail ? 26 : 30} ${width - 30} ${isDetail ? 38 : 42} ${width - 30} ${isDetail ? 54 : 58} V${height - (isDetail ? 54 : 58)} C${width - 30} ${height - (isDetail ? 38 : 42)} ${width - 42} ${height - (isDetail ? 26 : 30)} ${width - 58} ${height - (isDetail ? 26 : 30)} H${panelWidth + 30} Z" fill="#FAFBF8"/>`,
    `  <path d="M${panelWidth + 30} ${isDetail ? 26 : 30} L${panelWidth + 86} ${isDetail ? 26 : 30} L${panelWidth + 30} ${height - (isDetail ? 26 : 30)} Z" fill="#DCEAE6"/>`,
    `  <text x="${contentX}" y="${brandY}" font-family="${FONT}" font-size="${isDetail ? 24 : 28}" font-weight="800" fill="#F5C33B">occazGabon</text>`,
    `  <text x="${contentX}" y="${headlineY}" font-family="${FONT}" font-size="${headlineSize}" font-weight="800" fill="#FFFFFF">Vends tes occasions</text>`,
    `  <text x="${contentX}" y="${headlineY + (isDetail ? 44 : 52)}" font-family="${FONT}" font-size="${headlineSize}" font-weight="800" fill="#FFFFFF">${isDetail ? 'plus simplement' : 'en quelques minutes'}</text>`,
    `  <text x="${contentX}" y="${bodyY}" font-family="${FONT}" font-size="${bodySize}" font-weight="500" fill="#CFE2DE">Mode, téléphones, beauté et bonnes affaires au Gabon.</text>`,
    `  <g transform="translate(${contentX} ${ctaY})">`,
    `    <rect x="0" y="0" width="${isDetail ? 184 : 206}" height="${isDetail ? 46 : 52}" rx="${isDetail ? 23 : 26}" fill="#F5C33B"/>`,
    `    <text x="${isDetail ? 24 : 28}" y="${isDetail ? 30 : 34}" font-family="${FONT}" font-size="${isDetail ? 17 : 18}" font-weight="800" fill="#073F3C">Créer un compte</text>`,
    `    <text x="${isDetail ? 220 : 244}" y="${isDetail ? 30 : 34}" font-family="${FONT}" font-size="${isDetail ? 17 : 18}" font-weight="700" fill="#FFFFFF">${isDetail ? 'occaz-gabon.vercel.app' : 'Acheter ou publier'}</text>`,
    '  </g>',
    `  <rect x="${screenshotX - 12}" y="${screenshotY - 12}" width="${screenshotW + 24}" height="${screenshotH + 24}" rx="34" fill="#FFFFFF" filter="url(#imageShadow)"/>`,
    `  <rect x="${screenshotX}" y="${screenshotY}" width="${screenshotW}" height="${screenshotH}" rx="28" fill="none" stroke="#D9E6E2" stroke-width="2"/>`,
    '</svg>',
  ]);
}

async function renderBanner({ width, height, variant, output }) {
  const screenshotW = variant === 'detail' ? 320 : variant === 'home' ? 438 : 386;
  const screenshotH = variant === 'detail' ? 196 : variant === 'home' ? 292 : 234;
  const screenshot = await roundedScreenshot(screenshotW, screenshotH);
  const svg = shellSvg({ width, height, variant });

  await sharp(Buffer.from(svg))
    .composite([{ input: screenshot, left: variant === 'detail' ? 806 : variant === 'home' ? 684 : 736, top: variant === 'detail' ? 52 : variant === 'home' ? 52 : 54 }])
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(path.join(OUTPUT_DIR, output));
}

async function main() {
  ensureSource();
  await Promise.all([
    renderBanner({ width: 1200, height: 400, variant: 'home', output: 'occazgabon-home.png' }),
    renderBanner({ width: 1200, height: 375, variant: 'infeed', output: 'occazgabon-infeed.png' }),
    renderBanner({ width: 1200, height: 300, variant: 'detail', output: 'occazgabon-detail.png' }),
  ]);
  console.log('Bannières occazGabon générées.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
