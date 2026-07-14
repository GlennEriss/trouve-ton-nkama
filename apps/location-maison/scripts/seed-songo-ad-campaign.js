/* eslint-disable no-console */
/**
 * Crée ou met à jour la campagne interne SONGO pour 5 ans.
 *
 * Usage:
 *   node scripts/generate-songo-ad-assets.js
 *   node scripts/seed-songo-ad-campaign.js
 *   SONGO_AD_ENV_FILE=.env.local.dev node scripts/seed-songo-ad-campaign.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const ROOT_DIR = path.join(__dirname, '..');
const envFile = process.env.SONGO_AD_ENV_FILE || '.env.local.prod';
const envPath = path.join(ROOT_DIR, envFile);
dotenv.config({ path: envPath });

const ADVERTISER_ID = 'adv_songo_game';
const CAMPAIGN_ID = 'camp_songo_game_5ans';
const CREATED_BY = 'internal-songo-seed';
const STORAGE_PREFIX = 'ad-campaigns/songo-5ans-v1';
const CTA_URL = 'https://songo-game.com/download';

const ASSETS = {
  home: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/songo-home.png'),
    storagePath: `${STORAGE_PREFIX}/home.png`,
    token: 'songo-home-5ans-v1-20260714',
  },
  search_infeed: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/songo-infeed.png'),
    storagePath: `${STORAGE_PREFIX}/infeed.png`,
    token: 'songo-infeed-5ans-v1-20260714',
  },
  immobilier_infeed: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/songo-infeed.png'),
    storagePath: `${STORAGE_PREFIX}/infeed.png`,
    token: 'songo-infeed-5ans-v1-20260714',
  },
  property_detail: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/songo-detail.png'),
    storagePath: `${STORAGE_PREFIX}/detail.png`,
    token: 'songo-detail-5ans-v1-20260714',
  },
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable manquante: ${name} dans ${envPath}`);
  }
  return value;
}

function getStorageBucketName() {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${requireEnv('FIREBASE_PROJECT_ID')}.appspot.com`
  );
}

function initAdmin() {
  const serviceAccount = {
    projectId: requireEnv('FIREBASE_PROJECT_ID'),
    clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/gm, '\n'),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: getStorageBucketName(),
    });
  }

  return {
    db: admin.firestore(),
    bucket: admin.storage().bucket(),
  };
}

function downloadUrl(bucketName, storagePath, token) {
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

async function uploadAsset(bucket, asset) {
  if (!fs.existsSync(asset.localPath)) {
    throw new Error(`Visuel introuvable: ${asset.localPath}`);
  }

  await bucket.upload(asset.localPath, {
    destination: asset.storagePath,
    resumable: false,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: asset.token,
      },
    },
  });

  return downloadUrl(bucket.name, asset.storagePath, asset.token);
}

function addYears(date, years) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

async function main() {
  const { db, bucket } = initAdmin();
  const nowDate = new Date();
  const now = admin.firestore.Timestamp.fromDate(nowDate);
  const end = admin.firestore.Timestamp.fromDate(addYears(nowDate, 5));

  const uploaded = {};
  const uniqueAssets = new Map();
  Object.values(ASSETS).forEach((asset) => {
    uniqueAssets.set(asset.storagePath, asset);
  });

  for (const asset of uniqueAssets.values()) {
    const url = await uploadAsset(bucket, asset);
    uploaded[asset.storagePath] = url;
  }

  const assetUrlByPlacement = Object.fromEntries(
    Object.entries(ASSETS).map(([placement, asset]) => [
      placement,
      {
        imagePATH: asset.storagePath,
        imageURL: uploaded[asset.storagePath],
      },
    ]),
  );

  const advertiserRef = db.collection('advertisers').doc(ADVERTISER_ID);
  const campaignRef = db.collection('ad_campaigns').doc(CAMPAIGN_ID);
  const currentAdvertiser = await advertiserRef.get();
  const currentCampaign = await campaignRef.get();
  const advertiserCreatedAt = currentAdvertiser.exists
    ? currentAdvertiser.data()?.createdAt || now
    : now;
  const currentMetrics = currentCampaign.exists
    ? currentCampaign.data()?.metrics || { impressions: 0, clicks: 0 }
    : { impressions: 0, clicks: 0 };
  const createdAt = currentCampaign.exists ? currentCampaign.data()?.createdAt || now : now;

  await advertiserRef.set(
    {
      name: 'SONGO',
      businessName: 'SONGO',
      contactPhone: null,
      ownerUid: null,
      createdByAdminUid: CREATED_BY,
      notes: 'Annonceur interne: campagne jeu SONGO 5 ans.',
      createdAt: advertiserCreatedAt,
      updatedAt: now,
    },
    { merge: true },
  );

  await campaignRef.set(
    {
      advertiserId: ADVERTISER_ID,
      title: 'SONGO - jeu mobile - 5 ans',
      creative: {
        imagePATH: ASSETS.search_infeed.storagePath,
        imageURL: uploaded[ASSETS.search_infeed.storagePath],
        assets: assetUrlByPlacement,
        headline: 'SONGO est disponible !',
        body: 'Tutoriel interactif, IA hors connexion, 2 joueurs local et défis en ligne.',
        ctaLabel: 'Télécharger gratuit',
        ctaUrl: CTA_URL,
      },
      placements: ['home', 'search_infeed', 'immobilier_infeed', 'property_detail'],
      targeting: null,
      startDate: now,
      endDate: end,
      status: 'active',
      priority: 10,
      billing: {
        mode: 'admin_amount',
        amount: 0,
        currency: 'XAF',
        paymentMethod: 'interne',
        paymentReference: 'SONGO-5ANS',
        paidAt: now,
        paymentStatus: 'paid',
      },
      createdByAdminUid: CREATED_BY,
      metrics: currentMetrics,
      createdAt,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log('Campagne SONGO active.');
  console.log(`Annonceur: ${ADVERTISER_ID}`);
  console.log(`Campagne: ${CAMPAIGN_ID}`);
  console.log(`Début: ${now.toDate().toISOString().slice(0, 10)}`);
  console.log(`Fin: ${end.toDate().toISOString().slice(0, 10)}`);
}

main().catch((error) => {
  console.error('Seed SONGO échoué:', error.message);
  process.exit(1);
});
