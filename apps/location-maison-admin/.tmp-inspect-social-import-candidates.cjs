const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('missing env');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

(async () => {
  const snap = await db.collection('social_import_candidates').limit(5).get();
  console.log('count', snap.size);
  snap.forEach((doc) => {
    const data = doc.data() || {};
    console.log('doc', doc.id);
    console.log('keys', Object.keys(data).sort().join(','));
    if (data.payload && typeof data.payload === 'object') {
      console.log('payloadKeys', Object.keys(data.payload).sort().join(','));
    }
    if (data.normalized && typeof data.normalized === 'object') {
      console.log('normalizedKeys', Object.keys(data.normalized).sort().join(','));
    }
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
