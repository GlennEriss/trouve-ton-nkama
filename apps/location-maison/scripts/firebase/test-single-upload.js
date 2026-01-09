// Script de test pour uploader une seule propriété avec les images locales
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function testSingleUpload() {
  console.log('🧪 Test d\'upload d\'une seule propriété avec images locales...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Initialiser Firebase
    const serviceAccount = require('./firebase-config.js');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'location-maison-prod-167da.firebasestorage.app'
      });
    }
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Charger les propriétés
    const inputFile = path.join(__dirname, '..', 'apify-facebook-cursor', 'properties-extracted-combined-with-local-images.json');
    const data = await fs.readFile(inputFile, 'utf8');
    const jsonData = JSON.parse(data);
    const properties = jsonData.properties || jsonData;
    
    // Prendre la première propriété
    const property = properties[0];
    const imagesDir = path.join(__dirname, '..', 'download-img', 'images');
    
    console.log(`📝 Propriété: ${property.title}`);
    console.log(`📸 Nombre d'images: ${property.images.length}\n`);
    
    // Upload des images
    const firebaseImages = [];
    
    for (let i = 0; i < property.images.length; i++) {
      const image = property.images[i];
      
      // Détecter le chemin local
      let localImagePath = null;
      if (typeof image === 'object' && image.filePATH && !image.filePATH.startsWith('http')) {
        localImagePath = image.filePATH;
      }
      
      if (localImagePath) {
        console.log(`\n📤 Upload image ${i + 1}/${property.images.length}:`);
        console.log(`   Chemin local: ${localImagePath}`);
        
        // Construire le chemin complet
        const actualLocalPath = path.join(imagesDir, path.basename(localImagePath));
        console.log(`   Chemin complet: ${actualLocalPath}`);
        
        // Vérifier que le fichier existe
        try {
          await fs.access(actualLocalPath);
          console.log(`   ✅ Fichier existe`);
          
          // Upload vers Firebase Storage
          const fileName = `properties/test_${i}_${Date.now()}.jpg`;
          const file = bucket.file(fileName);
          
          console.log(`   📤 Upload vers: ${fileName}`);
          await file.save(await fs.readFile(actualLocalPath), {
            metadata: {
              contentType: 'image/jpeg',
            }
          });
          
          await file.makePublic();
          
          const fileURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          console.log(`   ✅ Upload réussi: ${fileURL}`);
          
          firebaseImages.push({
            filePATH: fileName,
            fileURL: fileURL
          });
          
        } catch (error) {
          console.log(`   ❌ Erreur: ${error.message}`);
        }
      } else {
        console.log(`\n⚠️  Image ${i + 1}: Pas de fichier local détecté`);
        console.log(`   Structure: ${JSON.stringify(image)}`);
      }
    }
    
    console.log(`\n📊 Résultat:`);
    console.log(`   Images uploadées: ${firebaseImages.length}/${property.images.length}`);
    console.log(`\n✅ Test terminé !`);
    
    if (firebaseImages.length > 0) {
      console.log(`\n🔗 Exemple d'URL Firebase Storage:`);
      console.log(`   ${firebaseImages[0].fileURL}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  }
}

testSingleUpload();

