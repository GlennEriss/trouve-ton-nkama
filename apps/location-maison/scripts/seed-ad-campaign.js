/* eslint-disable no-console */
/**
 * Crée un annonceur publicitaire + une campagne ACTIVE de test (emplacement
 * search_infeed) pour vérifier le rendu de SponsoredSlot.
 *
 * Usage:
 *   node scripts/seed-ad-campaign.js
 *   node scripts/seed-ad-campaign.js "https://exemple.com/banniere.jpg" "https://wa.me/24106000000"
 */

const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local.dev');
dotenv.config({ path: envPath });

function initFirestoreAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
  };
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      `Configuration Firebase incomplète: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY dans ${envPath}`
    );
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

async function main() {
  const imageURL =
    process.argv[2] ||
    'https://placehold.co/600x300/1FA89B/FFFFFF/png?text=Pub+Demo';
  const ctaUrl = process.argv[3] || 'https://wa.me/24106000000';

  const db = initFirestoreAdmin();
  const now = admin.firestore.Timestamp.now();
  const end = admin.firestore.Timestamp.fromMillis(now.toMillis() + 30 * 24 * 3600 * 1000);

  const advertiserRef = await db.collection('advertisers').add({
    name: 'Annonceur Démo',
    businessName: 'Resto Le Gabonais',
    contactPhone: '+24106000000',
    ownerUid: null,
    createdByAdminUid: 'seed-script',
    notes: 'Annonceur de test (seed)',
    createdAt: now,
    updatedAt: now,
  });

  const campaignRef = await db.collection('ad_campaigns').add({
    advertiserId: advertiserRef.id,
    title: 'Campagne démo - search in-feed',
    creative: {
      imagePATH: '',
      imageURL,
      headline: 'Le Gabonais — cuisine locale',
      body: 'Livraison à Libreville. Commandez maintenant !',
      ctaLabel: 'Commander sur WhatsApp',
      ctaUrl,
    },
    placements: ['search_infeed'],
    targeting: null,
    startDate: now,
    endDate: end,
    status: 'active',
    priority: 10,
    billing: {
      mode: 'admin_amount',
      amount: 25000,
      currency: 'XAF',
      paymentMethod: 'espèces',
      paymentReference: 'SEED-001',
      paidAt: now,
      paymentStatus: 'paid',
    },
    createdByAdminUid: 'seed-script',
    metrics: { impressions: 0, clicks: 0 },
    createdAt: now,
    updatedAt: now,
  });

  console.log('✅ Annonceur créé:', advertiserRef.id);
  console.log('✅ Campagne active créée:', campaignRef.id);
  console.log('→ Ouvre /search : la pub maison doit apparaître dans le feed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed échoué:', err);
  process.exit(1);
});
