// Trouver les doublons basés sur le titre et le prix
const admin = require('firebase-admin');

async function findDuplicates() {
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
    
    // Date d'aujourd'hui
    const today = new Date('2026-01-05T00:00:00Z');
    const startOfDay = admin.firestore.Timestamp.fromDate(today);
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date('2026-01-05T23:59:59Z'));
    
    const snapshot = await db.collection('properties')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    console.log(`📊 Analyse de ${snapshot.size} propriétés créées aujourd'hui...\n`);
    
    // Grouper par titre + prix
    const groups = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.title || ''}_${data.price || 0}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({
        id: doc.id,
        title: data.title,
        price: data.price,
        createdAt: data.createdAt?.toDate?.()?.toISOString()
      });
    });
    
    // Trouver les doublons
    const duplicates = [];
    Object.keys(groups).forEach((key) => {
      if (groups[key].length > 1) {
        duplicates.push({
          key,
          count: groups[key].length,
          properties: groups[key]
        });
      }
    });
    
    console.log(`🔍 ${duplicates.length} groupes de doublons trouvés:\n`);
    
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. "${dup.properties[0].title}" (${dup.count} copies)`);
      dup.properties.forEach((prop, i) => {
        console.log(`   ${i + 1}. ID: ${prop.id} - Créée: ${prop.createdAt}`);
      });
      console.log('');
    });
    
    const totalDuplicates = duplicates.reduce((sum, dup) => sum + (dup.count - 1), 0);
    const uniqueProperties = snapshot.size - totalDuplicates;
    
    console.log(`\n📊 Résumé:`);
    console.log(`   Total propriétés: ${snapshot.size}`);
    console.log(`   Propriétés uniques: ${uniqueProperties}`);
    console.log(`   Doublons à supprimer: ${totalDuplicates}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

findDuplicates();

