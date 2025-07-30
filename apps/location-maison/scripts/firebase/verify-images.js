// Vérifier que les URLs d'images dans Firestore sont correctes
const admin = require('firebase-admin');

async function verifyImageUrls() {
  console.log('🔍 Vérification des URLs d\'images dans Firestore...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Initialiser Firebase
    if (!admin.apps.length) {
      const serviceAccount = require('./firebase-config.js');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'home-rent-1534e.appspot.com'
      });
    }
    
    const db = admin.firestore();
    
    // Récupérer quelques propriétés pour vérifier
    const snapshot = await db.collection('properties').limit(5).get();
    
    console.log(`📋 Vérification de ${snapshot.size} propriétés...\n`);
    
    let totalImages = 0;
    let firebaseUrls = 0;
    let localPaths = 0;
    let httpUrls = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📝 ${data.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Created By: ${data.createdBy || 'Non défini'}`);
      console.log(`   State: ${data.state || 'Non défini'}`);
      console.log(`   Images (${data.images?.length || 0}):`);
      
      if (data.images && data.images.length > 0) {
        data.images.forEach((image, index) => {
          totalImages++;
          
          // Nouveau format: objet {filePATH, fileURL}
          if (typeof image === 'object' && image.filePATH && image.fileURL) {
            if (image.fileURL.startsWith('https://storage.googleapis.com/')) {
              firebaseUrls++;
              console.log(`     ${index + 1}. ✅ Firebase: ${image.filePATH} → ${image.fileURL.substring(0, 60)}...`);
            } else if (image.fileURL.startsWith('http')) {
              httpUrls++;
              console.log(`     ${index + 1}. 🌐 HTTP: ${image.filePATH} → ${image.fileURL.substring(0, 60)}...`);
            } else {
              console.log(`     ${index + 1}. ❓ Objet inconnu: ${image.filePATH} → ${image.fileURL}`);
            }
          } else {
            // Ancien format: string URL
            const urlStr = String(image || '');
            
            if (urlStr.startsWith('https://storage.googleapis.com/')) {
              firebaseUrls++;
              console.log(`     ${index + 1}. ✅ Firebase (legacy): ${urlStr.substring(0, 60)}...`);
            } else if (urlStr.startsWith('images/')) {
              localPaths++;
              console.log(`     ${index + 1}. ⚠️  Local: ${urlStr}`);
            } else if (urlStr.startsWith('http')) {
              httpUrls++;
              console.log(`     ${index + 1}. 🌐 HTTP (legacy): ${urlStr.substring(0, 60)}...`);
            } else {
              console.log(`     ${index + 1}. ❓ Inconnu: ${urlStr} (type: ${typeof image})`);
            }
          }
        });
      } else {
        console.log('     Aucune image');
      }
      console.log('');
    });
    
    console.log('📊 RÉSUMÉ:');
    console.log(`   Total images: ${totalImages}`);
    console.log(`   ✅ URLs Firebase Storage: ${firebaseUrls}`);
    console.log(`   ⚠️  Chemins locaux: ${localPaths}`);
    console.log(`   🌐 URLs HTTP externes: ${httpUrls}`);
    
    const firebasePercentage = totalImages > 0 ? ((firebaseUrls / totalImages) * 100).toFixed(1) : 0;
    console.log(`   📈 Pourcentage Firebase: ${firebasePercentage}%`);
    
    if (firebaseUrls === totalImages && totalImages > 0) {
      console.log('\n🎉 Toutes les images utilisent Firebase Storage !');
    } else if (localPaths > 0) {
      console.log('\n⚠️  Certaines images utilisent encore des chemins locaux.');
      console.log('   Relancez le script d\'upload pour les corriger.');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

verifyImageUrls(); 