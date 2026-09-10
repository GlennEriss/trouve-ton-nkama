/* eslint-disable no-console */
/**
 * Lecture seule : trouve un utilisateur par numéro de téléphone. Scanne toute la collection
 * `users` et compare chaque champ de type string (et chaque élément de tableau) aux variantes
 * du numéro. Ne modifie rien.
 *
 * Usage: node scripts/find-user-by-phone.js "+24177746211"
 */
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const envFileArg = process.argv[3];
const envPath = path.join(__dirname, '..', envFileArg || '.env.local.dev');
dotenv.config({ path: envPath });

function initFirestore() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
  };
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(`Config Firebase incomplète dans ${envPath}`);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

function normalize(s) {
  return String(s).replace(/\D/g, '');
}

function phoneMatchKeys(raw) {
  const d = normalize(raw); // 24177746211
  const local = d.replace(/^241/, ''); // 77746211
  return new Set([d, local].filter(Boolean));
}

function valueMatches(value, keys) {
  if (typeof value === 'string') {
    const n = normalize(value);
    return n.length >= 6 && (keys.has(n) || keys.has(n.replace(/^241/, '')) || keys.has(n.replace(/^0/, '')));
  }
  if (Array.isArray(value)) return value.some((v) => valueMatches(v, keys));
  return false;
}

async function main() {
  const raw = process.argv[2];
  if (!raw) throw new Error('Numéro requis : node scripts/find-user-by-phone.js "+24177746211" [.env.local.prod]');

  const db = initFirestore();
  console.log(`Projet: ${process.env.FIREBASE_PROJECT_ID}  (env: ${path.basename(envPath)})`);
  const keys = phoneMatchKeys(raw);
  console.log(`Clés de comparaison (chiffres seuls): ${[...keys].join(', ')}\n`);

  const snap = await db.collection('users').get();
  console.log(`${snap.size} documents dans "users", scan en cours...\n`);

  const hits = [];
  snap.forEach((doc) => {
    const data = doc.data();
    const matchedFields = Object.entries(data)
      .filter(([, v]) => valueMatches(v, keys))
      .map(([k]) => k);
    if (matchedFields.length) hits.push({ doc, matchedFields, data });
  });

  if (hits.length === 0) {
    console.log('❌ Aucun utilisateur trouvé dans ce projet.');
    process.exit(1);
  }

  for (const { doc, matchedFields, data } of hits) {
    console.log(`— doc id: ${doc.id}  (champs correspondants: ${matchedFields.join(', ')})`);
    console.log(`  uid: ${data.uid ?? '—'}`);
    console.log(`  email: ${data.email ?? '—'}`);
    console.log(`  nom: ${[data.firstname, data.lastname].filter(Boolean).join(' ') || '—'}`);
    console.log(`  credits actuels: ${data.credits ?? '(non défini)'}`);
    console.log('');
  }
  console.log(`${hits.length} correspondance(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Échec:', err.message);
  process.exit(1);
});
