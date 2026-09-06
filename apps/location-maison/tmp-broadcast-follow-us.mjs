import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local.prod' });
import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/gm, '\n');

admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
const db = admin.firestore();

const usersSnapshot = await db.collection('users').select('uid').get();
console.log(`Utilisateurs trouves: ${usersSnapshot.size}`);

const BATCH_LIMIT = 450;
let batch = db.batch();
let opsInBatch = 0;
let totalCreated = 0;
let skipped = 0;

for (const userDoc of usersSnapshot.docs) {
  const uid = (userDoc.data().uid || userDoc.id || '').trim();
  if (!uid) {
    skipped += 1;
    continue;
  }

  const notifRef = db.collection('notifications').doc();
  batch.set(notifRef, {
    type: 'ANNOUNCEMENT',
    title: 'Donnez de la force à Trouve Ton Nkama 💪',
    message: "Abonnez-vous à nos réseaux (Facebook, WhatsApp, TikTok, Instagram, Threads) pour nous aider à grandir. Ça prend 10 secondes !",
    createdFor: uid,
    isRead: false,
    state: 'IN_PROGRESS',
    actionUrl: '/suivez-nous',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  opsInBatch += 1;
  totalCreated += 1;

  if (opsInBatch >= BATCH_LIMIT) {
    await batch.commit();
    batch = db.batch();
    opsInBatch = 0;
  }
}

if (opsInBatch > 0) {
  await batch.commit();
}

console.log(`Notifications creees: ${totalCreated}`);
console.log(`Utilisateurs ignores (uid manquant): ${skipped}`);
process.exit(0);
