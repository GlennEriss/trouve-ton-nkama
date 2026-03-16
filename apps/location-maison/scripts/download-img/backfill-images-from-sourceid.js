const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

function parseArgs(argv) {
  const options = {
    mappedInput: null,
    output: null,
    rawFiles: [],
    rawDir: path.join(__dirname, '..', 'apify-facebook-cursor-v2', 'data', 'raw'),
    fetchOgImage: false,
    timeoutMs: 15000,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if ((arg === '--mapped-input' || arg === '-i') && next) {
      options.mappedInput = next;
      i++;
      continue;
    }
    if ((arg === '--output' || arg === '-o') && next) {
      options.output = next;
      i++;
      continue;
    }
    if (arg === '--raw-file' && next) {
      options.rawFiles.push(next);
      i++;
      continue;
    }
    if (arg === '--raw-files' && next) {
      options.rawFiles.push(
        ...next
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      );
      i++;
      continue;
    }
    if (arg === '--raw-dir' && next) {
      options.rawDir = next;
      i++;
      continue;
    }
    if (arg === '--fetch-og-image') {
      options.fetchOgImage = true;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.timeoutMs = parsed;
      }
      i++;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  if (!options.mappedInput) {
    throw new Error('Missing required --mapped-input');
  }
  if (!options.output) {
    const input = path.resolve(options.mappedInput);
    const ext = path.extname(input) || '.json';
    options.output = input.replace(new RegExp(`${ext}$`), `.backfilled${ext}`);
  }

  options.mappedInput = path.resolve(options.mappedInput);
  options.output = path.resolve(options.output);
  options.rawDir = path.resolve(options.rawDir);
  options.rawFiles = options.rawFiles.map((f) => path.resolve(f));

  return options;
}

function printUsage() {
  console.log(`
Usage:
  node scripts/download-img/backfill-images-from-sourceid.js --mapped-input <file> [options]

Options:
  -i, --mapped-input <file>   JSON mapped source
  -o, --output <file>         JSON output (default: *.backfilled.json)
      --raw-file <file>       Raw JSON file (repeatable)
      --raw-files <a,b,c>     Raw JSON files list
      --raw-dir <dir>         Directory scanned for *.json raw files
      --fetch-og-image        Try to fetch og:image from sourceId HTML
      --timeout-ms <ms>       HTTP timeout for og:image fetch (default: 15000)
  -h, --help                  Show this help
`);
}

function sanitizeSourceId(sourceId) {
  return String(sourceId || '')
    .replace(/^https?:\/\//i, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 140);
}

function isImageUrl(url) {
  const value = String(url || '').trim().toLowerCase();
  if (!value.startsWith('http')) return false;
  if (value.endsWith('.mp4')) return false;
  if (value.includes('video.')) return false;
  return (
    value.includes('scontent') ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(value)
  );
}

function extensionFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').pop() || '';
    const ext = last.includes('.') ? last.split('.').pop().toLowerCase() : '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  } catch (error) {}
  return 'jpg';
}

function addUnique(target, value) {
  if (!value) return;
  const url = String(value).trim();
  if (!isImageUrl(url)) return;
  if (!target.includes(url)) target.push(url);
}

function extractImageUrlsFromPost(post) {
  const urls = [];

  if (!post || typeof post !== 'object') return urls;

  if (Array.isArray(post.images)) {
    for (const image of post.images) {
      if (typeof image === 'string') addUnique(urls, image);
      if (image && typeof image === 'object') {
        addUnique(urls, image.fileURL);
        addUnique(urls, image.fileUrl);
        addUnique(urls, image.url);
      }
    }
  }

  if (Array.isArray(post.attachments)) {
    for (const attachment of post.attachments) {
      if (!attachment || typeof attachment !== 'object') continue;
      addUnique(urls, attachment.url);
      addUnique(urls, attachment.thumbnail);
      addUnique(urls, attachment.image?.uri);
    }
  }

  if (Array.isArray(post.media)) {
    for (const item of post.media) {
      if (!item || typeof item !== 'object') continue;
      const typeName = String(item.__typename || '').toLowerCase();
      if (typeName === 'photo') {
        addUnique(urls, item.image?.uri);
        addUnique(urls, item.thumbnail);
        addUnique(urls, item.url);
      } else if (typeName === 'video') {
        // For videos keep only image previews, never mp4.
        addUnique(urls, item.thumbnailImage?.uri);
        addUnique(urls, item.image?.uri);
        addUnique(urls, item.thumbnail);
      } else {
        addUnique(urls, item.image?.uri);
        addUnique(urls, item.thumbnail);
        addUnique(urls, item.url);
      }
    }
  }

  return urls;
}

async function loadRawPostsFromFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const payload = JSON.parse(content);
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.posts)) return payload.posts;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

async function discoverRawFiles(options) {
  if (options.rawFiles.length > 0) return options.rawFiles;

  try {
    const entries = await fs.readdir(options.rawDir);
    return entries
      .filter((name) => name.toLowerCase().endsWith('.json'))
      .map((name) => path.join(options.rawDir, name))
      .sort();
  } catch (error) {
    return [];
  }
}

function fetchHtml(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const client = String(url).startsWith('https://') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Timeout'));
    });
  });
}

async function fetchOgImage(sourceId, timeoutMs) {
  try {
    const html = await fetchHtml(sourceId, timeoutMs);
    const match = html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
    );
    return match ? match[1] : '';
  } catch (error) {
    return '';
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  const mappedData = JSON.parse(await fs.readFile(options.mappedInput, 'utf8'));
  const mappedRows = Array.isArray(mappedData)
    ? mappedData
    : Array.isArray(mappedData.properties)
      ? mappedData.properties
      : [];

  console.log(`Mapped loaded: ${mappedRows.length} rows`);

  const rawFiles = await discoverRawFiles(options);
  console.log(`Raw files scanned: ${rawFiles.length}`);

  const sourceToRawImages = new Map();
  for (const filePath of rawFiles) {
    let posts = [];
    try {
      posts = await loadRawPostsFromFile(filePath);
    } catch (error) {
      console.warn(`Skip raw file (invalid JSON): ${filePath}`);
      continue;
    }

    for (const post of posts) {
      const sourceId = post?.url || post?.sourceId || post?.postUrl;
      if (!sourceId) continue;
      const extracted = extractImageUrlsFromPost(post);
      if (extracted.length === 0) continue;

      const previous = sourceToRawImages.get(sourceId) || [];
      const merged = [...previous];
      for (const url of extracted) addUnique(merged, url);
      sourceToRawImages.set(sourceId, merged);
    }
  }

  let increased = 0;
  let unchanged = 0;
  let totalAdded = 0;

  for (const row of mappedRows) {
    const sourceId = row.sourceId;
    const currentImages = Array.isArray(row.images) ? row.images : [];
    const currentUrls = [];
    for (const image of currentImages) {
      if (typeof image === 'string') addUnique(currentUrls, image);
      if (image && typeof image === 'object') addUnique(currentUrls, image.fileURL);
    }

    const candidates = [...currentUrls];
    const rawUrls = sourceToRawImages.get(sourceId) || [];
    for (const url of rawUrls) addUnique(candidates, url);

    if (options.fetchOgImage && candidates.length === 0 && sourceId) {
      const ogImage = await fetchOgImage(sourceId, options.timeoutMs);
      addUnique(candidates, ogImage);
    }

    const before = currentUrls.length;
    const after = candidates.length;

    if (after > before) {
      increased++;
      totalAdded += after - before;
    } else {
      unchanged++;
    }

    const sourceSlug = sanitizeSourceId(sourceId || row.id || 'property');
    row.images = candidates.map((url, index) => ({
      filePATH: `raw/${sourceSlug}/${index + 1}.${extensionFromUrl(url)}`,
      fileURL: url,
    }));
  }

  const outputPayload = Array.isArray(mappedData)
    ? mappedRows
    : Array.isArray(mappedData.properties)
      ? { ...mappedData, properties: mappedRows }
      : mappedRows;

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(outputPayload, null, 2), 'utf8');

  console.log('\nBackfill completed');
  console.log(`Output: ${options.output}`);
  console.log(`Rows increased: ${increased}`);
  console.log(`Rows unchanged: ${unchanged}`);
  console.log(`Total images added: ${totalAdded}`);
}

run().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

