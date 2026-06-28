/* eslint-disable no-console */
/**
 * Crée ou met à jour la campagne interne occazGabon pour 5 ans.
 *
 * Usage:
 *   node scripts/seed-occazgabon-ad-campaign.js
 *   OCCAZ_AD_ENV_FILE=.env.local.prod node scripts/seed-occazgabon-ad-campaign.js
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

const ROOT_DIR = path.join(__dirname, '..');
const envFile = process.env.OCCAZ_AD_ENV_FILE || '.env.local.prod';
const envPath = path.join(ROOT_DIR, envFile);
dotenv.config({ path: envPath });

const ADVERTISER_ID = 'adv_occazgabon';
const CAMPAIGN_ID = 'camp_occazgabon_5ans';
const CREATED_BY = 'internal-occazgabon-seed';
const STORAGE_PREFIX = 'ad-campaigns/occazgabon-5ans-v3';
const CTA_URL = 'https://occaz-gabon.vercel.app/connexion?next=%2Fpublier';

const ASSETS = {
  home: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/occazgabon-home.png'),
    storagePath: `${STORAGE_PREFIX}/home.png`,
    token: 'occazgabon-home-5ans-v3-20260628',
  },
  search_infeed: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/occazgabon-infeed.png'),
    storagePath: `${STORAGE_PREFIX}/infeed.png`,
    token: 'occazgabon-infeed-5ans-v3-20260628',
  },
  immobilier_infeed: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/occazgabon-infeed.png'),
    storagePath: `${STORAGE_PREFIX}/infeed.png`,
    token: 'occazgabon-infeed-5ans-v3-20260628',
  },
  property_detail: {
    localPath: path.join(ROOT_DIR, 'public/assets/ads/generated/occazgabon-detail.png'),
    storagePath: `${STORAGE_PREFIX}/detail.png`,
    token: 'occazgabon-detail-5ans-v3-20260628',
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
      contentType: asset.storagePath.endsWith('.png') ? 'image/png' : 'image/svg+xml; charset=utf-8',
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
      name: 'occazGabon',
      businessName: 'occazGabon',
      contactPhone: null,
      ownerUid: null,
      createdByAdminUid: CREATED_BY,
      notes: 'Annonceur interne: campagne croisée occazGabon 5 ans.',
      createdAt: advertiserCreatedAt,
      updatedAt: now,
    },
    { merge: true },
  );

  await campaignRef.set(
    {
      advertiserId: ADVERTISER_ID,
      title: 'occazGabon - acquisition vendeurs et acheteurs - 5 ans',
      creative: {
        imagePATH: ASSETS.search_infeed.storagePath,
        imageURL: uploaded[ASSETS.search_infeed.storagePath],
        assets: assetUrlByPlacement,
        headline: 'Vends tes occasions en quelques minutes',
        body: 'Mode, téléphones, beauté et bonnes affaires au Gabon.',
        ctaLabel: 'Créer un compte',
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
        paymentReference: 'OCCAZGABON-5ANS',
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

  console.log('Campagne occazGabon active.');
  console.log(`Annonceur: ${ADVERTISER_ID}`);
  console.log(`Campagne: ${CAMPAIGN_ID}`);
  console.log(`Fin: ${end.toDate().toISOString().slice(0, 10)}`);
}

main().catch((error) => {
  console.error('Seed occazGabon échoué:', error.message);
  process.exit(1);
});
