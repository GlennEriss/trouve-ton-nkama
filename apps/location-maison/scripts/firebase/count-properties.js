// Compter toutes les propriétés uploadées aujourd'hui (5 janvier 2026)
const admin = require('firebase-admin');

async function countProperties() {
  try {
    require('dotenv').config();
    
    const serviceAccount = require('./firebase-config.js');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    
    const db = admin.firestore();
    
    // Date d'aujourd'hui (5 janvier 2026)
    const today = new Date('2026-01-05T00:00:00Z');
    const startOfDay = admin.firestore.Timestamp.fromDate(today);
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date('2026-01-05T23:59:59Z'));
    
    console.log('📊 Comptage des propriétés créées le 5 janvier 2026...\n');
    
    // Récupérer toutes les propriétés créées aujourd'hui
    const snapshot = await db.collection('properties')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    console.log(`✅ Total de propriétés créées aujourd'hui: ${snapshot.size}\n`);
    
    // Compter celles avec Firebase Storage vs Facebook
    let firebaseCount = 0;
    let facebookCount = 0;
    let noImages = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.images || data.images.length === 0) {
        noImages++;
      } else {
        const firstImage = data.images[0];
        const isFirebase = typeof firstImage === 'object' && firstImage.fileURL?.includes('storage.googleapis.com');
        if (isFirebase) {
          firebaseCount++;
        } else {
          facebookCount++;
        }
      }
    });
    
    console.log('📊 Répartition:');
    console.log(`   ✅ Avec Firebase Storage: ${firebaseCount}`);
    console.log(`   ❌ Avec URLs Facebook: ${facebookCount}`);
    console.log(`   ⚠️  Sans images: ${noImages}`);
    
    // Afficher quelques exemples
    console.log('\n📝 Exemples de propriétés:');
    let count = 0;
    snapshot.forEach((doc) => {
      if (count < 5) {
        const data = doc.data();
        const hasFirebase = data.images && data.images.length > 0 && 
          typeof data.images[0] === 'object' && 
          data.images[0].fileURL?.includes('storage.googleapis.com');
        console.log(`   ${count + 1}. ${data.title || 'Sans titre'} - ${hasFirebase ? '✅ Firebase' : '❌ Facebook'}`);
        count++;
      }
    });
    
    // Vérifier le fichier source
    const fs = require('fs');
    const path = require('path');
    const inputFile = path.join(__dirname, '..', 'apify-facebook-cursor', 'properties-extracted-combined-with-local-images.json');
    if (fs.existsSync(inputFile)) {
      const sourceData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
      const sourceProperties = sourceData.properties || sourceData;
      console.log(`\n📄 Fichier source: ${sourceProperties.length} propriétés`);
      console.log(`📊 Différence: ${sourceProperties.length - snapshot.size} propriétés non uploadées`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

countProperties();

