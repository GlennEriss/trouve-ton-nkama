/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.join(__dirname, '..');
const SOURCE_GAME = path.join(ROOT_DIR, 'public/assets/ads/sources/songo-game.png');
const SOURCE_LOGO = path.join(ROOT_DIR, 'public/assets/ads/sources/songo-logo.png');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public/assets/ads/generated');

const FONT = 'Avenir Next, Helvetica Neue, Arial, sans-serif';

function ensureSources() {
  for (const source of [SOURCE_GAME, SOURCE_LOGO]) {
    if (!fs.existsSync(source)) {
      throw new Error(`Image source SONGO introuvable: ${source}`);
    }
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function roundedImage(source, width, height, radius, options = {}) {
  const image = await sharp(source)
    .resize(width, height, {
      fit: options.fit || 'cover',
      background: options.background || '#0A1B22',
      position: options.position || 'center',
    })
    .png()
    .toBuffer();

  const mask = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/>
    </svg>
  `);

  return sharp(image).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

function shellSvg({ width, height, variant }) {
  const isHome = variant === 'home';
  const isDetail = variant === 'detail';

  const logoX = 56;
  const logoY = isDetail ? 46 : 58;
  const logoSize = isDetail ? 78 : 92;
  const contentX = 170;
  const brandY = isDetail ? 72 : 88;
  const headlineY = isDetail ? 126 : 156;
  const headlineSize = isDetail ? 34 : isHome ? 48 : 44;
  const bodyY = isDetail ? 190 : 222;
  const bodySize = isDetail ? 17 : 21;
  const ctaY = isDetail ? 218 : isHome ? 286 : 276;
  const screenshotX = isDetail ? 758 : isHome ? 650 : 668;
  const screenshotY = isDetail ? 58 : isHome ? 70 : 72;
  const screenshotW = isDetail ? 370 : isHome ? 496 : 468;
  const screenshotH = isDetail ? 170 : isHome ? 229 : 216;

  const headlineSecond = isDetail ? 'JOUEZ PARTOUT' : 'APPRENEZ, JOUEZ, DEFIEZ';
  const body = isDetail
    ? 'Tutoriel, IA, local et online.'
    : 'Tutoriel, IA hors connexion, duo local et online.';

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <defs>',
    '    <filter id="softShadow" x="-12%" y="-16%" width="124%" height="132%">',
    '      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#02090C" flood-opacity="0.32"/>',
    '    </filter>',
    '    <filter id="imageShadow" x="-14%" y="-18%" width="128%" height="136%">',
    '      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#02090C" flood-opacity="0.28"/>',
    '    </filter>',
    '  </defs>',
    '  <rect width="100%" height="100%" fill="#08171D"/>',
    `  <rect x="26" y="${isDetail ? 24 : 30}" width="${width - 52}" height="${height - (isDetail ? 48 : 60)}" rx="30" fill="#0C222A" filter="url(#softShadow)"/>`,
    `  <path d="M26 ${height - 76} H${width - 26} V${height - (isDetail ? 24 : 30)} H26 Z" fill="#122F36"/>`,
    `  <rect x="26" y="${isDetail ? 24 : 30}" width="14" height="${height - (isDetail ? 48 : 60)}" rx="7" fill="#0EA5C6"/>`,
    `  <rect x="${contentX}" y="${brandY - 30}" width="${isDetail ? 160 : 184}" height="${isDetail ? 32 : 36}" rx="${isDetail ? 16 : 18}" fill="#D8A14A"/>`,
    `  <text x="${contentX + 20}" y="${brandY - 8}" font-family="${FONT}" font-size="${isDetail ? 15 : 17}" font-weight="800" fill="#0A1B22">SONGO</text>`,
    `  <text x="${contentX}" y="${headlineY}" font-family="${FONT}" font-size="${headlineSize}" font-weight="900" fill="#FFFFFF">EST DISPONIBLE !</text>`,
    `  <text x="${contentX}" y="${headlineY + (isDetail ? 40 : 52)}" font-family="${FONT}" font-size="${isDetail ? 26 : 32}" font-weight="900" fill="#9FE9F4">${headlineSecond}</text>`,
    `  <text x="${contentX}" y="${bodyY}" font-family="${FONT}" font-size="${bodySize}" font-weight="500" fill="#DDE8EA">${body}</text>`,
    `  <g transform="translate(${contentX} ${ctaY})">`,
    `    <rect x="0" y="0" width="${isDetail ? 214 : 252}" height="${isDetail ? 46 : 54}" rx="${isDetail ? 23 : 27}" fill="#F5B445"/>`,
    `    <text x="${isDetail ? 22 : 26}" y="${isDetail ? 30 : 35}" font-family="${FONT}" font-size="${isDetail ? 17 : 19}" font-weight="900" fill="#07151A">Télécharger gratuit</text>`,
    `    <text x="${isDetail ? 244 : 286}" y="${isDetail ? 30 : 35}" font-family="${FONT}" font-size="${isDetail ? 17 : 18}" font-weight="800" fill="#FFFFFF">Android et iPhone</text>`,
    '  </g>',
    isDetail
      ? ''
      : `  <text x="${contentX}" y="${height - 42}" font-family="${FONT}" font-size="18" font-weight="700" fill="#9FE9F4">songo-game.com/download</text>`,
    `  <rect x="${screenshotX - 14}" y="${screenshotY - 14}" width="${screenshotW + 28}" height="${screenshotH + 28}" rx="32" fill="#07151A" filter="url(#imageShadow)"/>`,
    `  <rect x="${screenshotX - 14}" y="${screenshotY - 14}" width="${screenshotW + 28}" height="${screenshotH + 28}" rx="32" fill="none" stroke="#2FC9E4" stroke-width="2"/>`,
    `  <rect x="${logoX - 8}" y="${logoY - 8}" width="${logoSize + 16}" height="${logoSize + 16}" rx="26" fill="#0EA5C6"/>`,
    '</svg>',
  ].join('\n');
}

async function renderBanner({ width, height, variant, output }) {
  const isHome = variant === 'home';
  const isDetail = variant === 'detail';
  const logoSize = isDetail ? 78 : 92;
  const screenshotW = isDetail ? 370 : isHome ? 496 : 468;
  const screenshotH = isDetail ? 170 : isHome ? 229 : 216;
  const screenshotX = isDetail ? 758 : isHome ? 650 : 668;
  const screenshotY = isDetail ? 58 : isHome ? 70 : 72;
  const logoX = 56;
  const logoY = isDetail ? 46 : 58;

  const [screenshot, logo] = await Promise.all([
    roundedImage(SOURCE_GAME, screenshotW, screenshotH, 24, { fit: 'cover' }),
    roundedImage(SOURCE_LOGO, logoSize, logoSize, 20, { fit: 'cover' }),
  ]);

  await sharp(Buffer.from(shellSvg({ width, height, variant })))
    .composite([
      { input: screenshot, left: screenshotX, top: screenshotY },
      { input: logo, left: logoX, top: logoY },
    ])
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(path.join(OUTPUT_DIR, output));
}

async function main() {
  ensureSources();
  await Promise.all([
    renderBanner({ width: 1200, height: 400, variant: 'home', output: 'songo-home.png' }),
    renderBanner({ width: 1200, height: 375, variant: 'infeed', output: 'songo-infeed.png' }),
    renderBanner({ width: 1200, height: 300, variant: 'detail', output: 'songo-detail.png' }),
  ]);
  console.log('Bannières SONGO générées.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
