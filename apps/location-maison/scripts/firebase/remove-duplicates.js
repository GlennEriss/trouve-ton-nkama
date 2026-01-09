// Supprimer les doublons en gardant la version la plus récente
const admin = require('firebase-admin');

async function removeDuplicates() {
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
    
    console.log(`📊 Analyse de ${snapshot.size} propriétés...\n`);
    
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
        createdAt: data.createdAt,
        hasFirebaseStorage: data.images && data.images.length > 0 && 
          typeof data.images[0] === 'object' && 
          data.images[0].fileURL?.includes('storage.googleapis.com')
      });
    });
    
    // Trouver les doublons et garder la plus récente avec Firebase Storage
    const toDelete = [];
    Object.keys(groups).forEach((key) => {
      if (groups[key].length > 1) {
        // Trier par date (plus récent en premier) et prioriser Firebase Storage
        groups[key].sort((a, b) => {
          // Prioriser Firebase Storage
          if (a.hasFirebaseStorage && !b.hasFirebaseStorage) return -1;
          if (!a.hasFirebaseStorage && b.hasFirebaseStorage) return 1;
          // Sinon, plus récent en premier
          return b.createdAt.seconds - a.createdAt.seconds;
        });
        
        // Garder la première, supprimer les autres
        for (let i = 1; i < groups[key].length; i++) {
          toDelete.push(groups[key][i].id);
        }
      }
    });
    
    console.log(`🗑️  ${toDelete.length} doublons à supprimer\n`);
    
    if (toDelete.length === 0) {
      console.log('✅ Aucun doublon à supprimer.');
      return;
    }
    
    // Supprimer les doublons
    const batch = db.batch();
    let deleted = 0;
    
    for (let i = 0; i < toDelete.length; i++) {
      const docRef = db.collection('properties').doc(toDelete[i]);
      batch.delete(docRef);
      deleted++;
      
      // Commit tous les 500 (limite Firestore)
      if ((i + 1) % 500 === 0) {
        await batch.commit();
        console.log(`💾 ${i + 1}/${toDelete.length} supprimés...`);
      }
    }
    
    // Commit les restants
    if (toDelete.length % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n✅ ${deleted} doublons supprimés !`);
    console.log(`📊 Propriétés restantes: ${snapshot.size - deleted}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

removeDuplicates();

