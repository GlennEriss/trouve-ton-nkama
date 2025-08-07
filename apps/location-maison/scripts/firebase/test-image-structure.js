// Test de la nouvelle structure d'images {filePath, fileUrl}
const admin = require('firebase-admin');

async function testImageStructure() {
  console.log('🧪 Test de la structure d\'images {filePath, fileUrl}...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Initialiser Firebase
    if (!admin.apps.length) {
      const serviceAccount = require('./firebase-config.js');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    console.log('🌍 ENVIRONNEMENT:');
    console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`   Storage: ${process.env.FIREBASE_STORAGE_BUCKET}\n`);
    
    // Créer une propriété de test avec la nouvelle structure
    const testProperty = {
      title: "Test Property - New Image Structure",
      description: "Propriété de test pour valider la structure {filePath, fileUrl}",
      price: 150000,
      contact: "077933932",
      images: [
        {
          filePATH: "properties/test_0_0_12345.jpg",
          fileURL: `https://storage.googleapis.com/${bucket.name}/properties/test_0_0_12345.jpg`
        },
        {
          filePATH: "properties/test_0_1_12346.jpg", 
          fileURL: `https://storage.googleapis.com/${bucket.name}/properties/test_0_1_12346.jpg`
        }
      ],
      city: "Libreville",
      typeProperty: "Apartment",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: process.env.CREATED_BY || 'test_script',
      state: 'IN_PROGRESS',
      source: 'test_image_structure',
      isActive: true
    };
    
    console.log('📋 Propriété de test à créer:');
    console.log('   Title:', testProperty.title);
    console.log('   Images structure:');
    testProperty.images.forEach((img, index) => {
      console.log(`     ${index + 1}. filePATH: ${img.filePATH}`);
      console.log(`        fileURL: ${img.fileURL}`);
    });
    
    // Sauvegarder dans Firestore
    const docRef = await db.collection('properties').add(testProperty);
    console.log(`\n✅ Propriété test sauvegardée: ${docRef.id}`);
    
    // Lire la propriété sauvegardée pour vérifier
    const doc = await docRef.get();
    const savedData = doc.data();
    
    console.log('\n📊 VÉRIFICATION DE LA STRUCTURE:');
    console.log('   ID:', doc.id);
    console.log('   Images sauvegardées:');
    
    if (savedData.images && savedData.images.length > 0) {
      savedData.images.forEach((img, index) => {
        if (typeof img === 'object' && img.filePATH && img.fileURL) {
          console.log(`   ✅ Image ${index + 1}:`);
          console.log(`      filePATH: ${img.filePATH}`);
          console.log(`      fileURL: ${img.fileURL}`);
          console.log(`      Type: ${typeof img} ✅`);
        } else {
          console.log(`   ❌ Image ${index + 1}: Structure incorrecte`);
          console.log(`      Contenu: ${JSON.stringify(img)}`);
          console.log(`      Type: ${typeof img}`);
        }
      });
    } else {
      console.log('   ❌ Aucune image trouvée');
    }
    
    console.log('\n🎯 VALIDATION:');
    const isValidStructure = savedData.images && 
      savedData.images.every(img => 
        typeof img === 'object' && 
        typeof img.filePATH === 'string' && 
        typeof img.fileURL === 'string'
      );
      
    if (isValidStructure) {
      console.log('   ✅ Structure {filePATH, fileURL} validée !');
      console.log('   ✅ Tous les objets ont les bonnes propriétés');
    } else {
      console.log('   ❌ Structure invalide détectée');
    }
    
    console.log('\n🧹 Nettoyage...');
    await docRef.delete();
    console.log('   ✅ Propriété de test supprimée');
    
    console.log('\n🎉 Test de structure terminé !');
    
  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

testImageStructure(); 