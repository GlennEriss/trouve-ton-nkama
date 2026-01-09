// Trouver les propriétés manquantes
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function findMissing() {
  try {
    require('dotenv').config();
    
    // Charger les propriétés du fichier source
    const inputFile = path.join(__dirname, '..', 'apify-facebook-cursor', 'properties-extracted-combined-with-local-images.json');
    const sourceData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const sourceProperties = sourceData.properties || sourceData;
    
    // Charger Firebase
    const serviceAccount = require('./firebase-config.js');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    
    const db = admin.firestore();
    
    // Date d'aujourd'hui
    const today = new Date('2026-01-05T00:00:00Z');
    const startOfDay = admin.firestore.Timestamp.fromDate(today);
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date('2026-01-05T23:59:59Z'));
    
    const snapshot = await db.collection('properties')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    // Créer un Set des titres + prix uploadés
    const uploadedKeys = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.title || ''}_${data.price || 0}`;
      uploadedKeys.add(key);
    });
    
    // Trouver les propriétés manquantes
    const missing = [];
    sourceProperties.forEach((prop) => {
      const key = `${prop.title || ''}_${prop.price || 0}`;
      if (!uploadedKeys.has(key)) {
        missing.push({
          title: prop.title,
          price: prop.price,
          index: sourceProperties.indexOf(prop)
        });
      }
    });
    
    console.log(`📊 Analyse:\n`);
    console.log(`   Fichier source: ${sourceProperties.length} propriétés`);
    console.log(`   Uploadées dans Firestore: ${snapshot.size}`);
    console.log(`   Manquantes: ${missing.length}\n`);
    
    if (missing.length > 0) {
      console.log(`❌ Propriétés manquantes:\n`);
      missing.forEach((prop, i) => {
        console.log(`${i + 1}. "${prop.title}" - ${prop.price} FCFA (index: ${prop.index})`);
      });
    } else {
      console.log('✅ Toutes les propriétés sont uploadées !');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

findMissing();

