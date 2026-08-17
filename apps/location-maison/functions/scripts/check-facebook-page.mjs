/**
 * Vérifie la configuration Facebook AVANT de créer les secrets Firebase.
 *
 * L'erreur la plus fréquente est de déployer un jeton utilisateur de 60 jours en croyant avoir
 * un jeton de Page permanent : tout fonctionne, puis la publication s'arrête silencieusement
 * deux mois plus tard. Ce script refuse explicitement ce cas.
 *
 * Usage :
 *   FACEBOOK_APP_ID=... FACEBOOK_APP_SECRET=... FACEBOOK_PAGE_ACCESS_TOKEN=... \
 *     node scripts/check-facebook-page.mjs
 *
 *   ... --publish     publie un vrai post de test sur la Page (visible publiquement)
 */

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION?.trim() || 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const appId = process.env.FACEBOOK_APP_ID?.trim();
const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
const shouldPublish = process.argv.includes('--publish');

if (!appId || !appSecret || !token) {
  console.error('Variables requises : FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_PAGE_ACCESS_TOKEN');
  process.exit(1);
}

async function graph(path, params = {}) {
  const url = new URL(`${GRAPH}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
  }
  return payload;
}

let failures = 0;
const fail = (message) => { failures += 1; console.log(`  ✗ ${message}`); };
const pass = (message) => console.log(`  ✓ ${message}`);

console.log(`Graph API ${GRAPH_VERSION}\n`);

// --- 1. Nature et validité du jeton ---
console.log('Jeton');
const debug = await graph('/debug_token', {
  input_token: token,
  access_token: `${appId}|${appSecret}`,
});
const data = debug.data ?? {};

if (data.type === 'PAGE') {
  pass(`jeton de Page (page ${data.profile_id ?? '?'})`);
} else {
  fail(`type "${data.type}" — il faut un jeton de PAGE, pas un jeton utilisateur. Récupère-le via /me/accounts.`);
}

if (data.is_valid) {
  pass('jeton valide');
} else {
  fail('jeton invalide ou révoqué');
}

// expires_at = 0 signifie "n'expire jamais" : c'est le seul cas acceptable en production.
if (data.expires_at === 0) {
  pass("n'expire jamais");
} else {
  const when = new Date((data.expires_at ?? 0) * 1000).toISOString();
  fail(`expire le ${when} — dérive le jeton de Page depuis un jeton utilisateur LONGUE DURÉE, sinon la publication s'arrêtera toute seule`);
}

const scopes = data.scopes ?? [];
for (const required of ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list']) {
  if (scopes.includes(required)) {
    pass(`permission ${required}`);
  } else {
    fail(`permission ${required} manquante`);
  }
}

// --- 2. Page atteignable ---
console.log('\nPage');
const page = await graph('/me', { access_token: token, fields: 'id,name,link' });
pass(`${page.name} (id ${page.id})`);
console.log(`  → FACEBOOK_PAGE_ID=${page.id}`);

// --- 3. Publication réelle, uniquement sur demande explicite ---
if (shouldPublish) {
  console.log('\nPublication de test');
  const response = await fetch(`${GRAPH}/${page.id}/feed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message: 'Test de configuration Tonnkama — ce post peut être supprimé.',
      access_token: token,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) {
    fail(`échec : ${payload?.error?.message ?? response.status}`);
  } else {
    pass(`post créé : ${payload.id}`);
    console.log('  → pense à le supprimer depuis la Page');
  }
} else {
  console.log('\nPublication de test non effectuée (ajouter --publish).');
}

console.log(failures === 0 ? '\nConfiguration prête.' : `\n${failures} problème(s) à corriger avant de créer les secrets.`);
process.exit(failures === 0 ? 0 : 1);
