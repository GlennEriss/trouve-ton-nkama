// Vérifier les dernières propriétés uploadées dans Firestore
const admin = require('firebase-admin');

async function verifyLatestUploads() {
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
    
    // Récupérer les 5 dernières propriétés créées
    const snapshot = await db.collection('properties')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`📊 Vérification des ${snapshot.size} dernières propriétés uploadées:\n`);
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n${index + 1}. ${data.title || 'Sans titre'}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Créée: ${data.createdAt?.toDate?.()?.toISOString() || 'N/A'}`);
      
      if (data.images && data.images.length > 0) {
        const firstImage = data.images[0];
        const isFirebase = typeof firstImage === 'object' && firstImage.fileURL?.includes('storage.googleapis.com');
        console.log(`   Images: ${data.images.length}`);
        console.log(`   Première image:`);
        console.log(`     filePATH: ${typeof firstImage === 'object' ? firstImage.filePATH : 'N/A'}`);
        console.log(`     fileURL: ${typeof firstImage === 'object' ? firstImage.fileURL?.substring(0, 100) + '...' : firstImage}`);
        console.log(`     ✅ Firebase Storage: ${isFirebase ? 'OUI' : '❌ NON (URL Facebook)'}`);
      }
    });
    
    // Compter les propriétés avec Firebase Storage vs Facebook
    const allSnapshot = await db.collection('properties')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    let firebaseCount = 0;
    let facebookCount = 0;
    
    allSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.images && data.images.length > 0) {
        const firstImage = data.images[0];
        const isFirebase = typeof firstImage === 'object' && firstImage.fileURL?.includes('storage.googleapis.com');
        if (isFirebase) {
          firebaseCount++;
        } else {
          facebookCount++;
        }
      }
    });
    
    console.log(`\n\n📊 Statistiques globales (100 dernières propriétés):`);
    console.log(`   ✅ Avec Firebase Storage: ${firebaseCount}`);
    console.log(`   ❌ Avec URLs Facebook: ${facebookCount}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

verifyLatestUploads();

