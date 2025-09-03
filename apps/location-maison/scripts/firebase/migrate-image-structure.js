// Script pour migrer les anciennes structures d'images vers {filePath, fileUrl}
const admin = require('firebase-admin');

async function migrateImageStructure() {
  console.log('🔄 Migration des structures d\'images...\n');
  
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
    console.log(`   Storage: ${bucket.name}\n`);
    
    // Récupérer toutes les propriétés
    console.log('📄 Chargement des propriétés...');
    const snapshot = await db.collection('properties').get();
    
    console.log(`✅ ${snapshot.size} propriétés trouvées\n`);
    
    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    let noImagesCount = 0;
    let errorCount = 0;
    
    console.log('🔍 Analyse et migration...\n');
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      console.log(`📝 ${data.title?.substring(0, 50)}...`);
      console.log(`   ID: ${doc.id}`);
      
      if (!data.images || data.images.length === 0) {
        console.log('   ⚪ Aucune image - Ignoré\n');
        noImagesCount++;
        continue;
      }
      
      // Vérifier si c'est déjà migré
      const isAlreadyMigrated = data.images.every(img => 
        typeof img === 'object' && img.filePATH && img.fileURL
      );
      
      if (isAlreadyMigrated) {
        console.log('   ✅ Déjà migré - Ignoré\n');
        alreadyMigratedCount++;
        continue;
      }
      
      // Migration nécessaire
      console.log('   🔄 Migration requise...');
      
      try {
        const migratedImages = data.images.map((image, index) => {
          if (typeof image === 'object' && image.filePATH && image.fileURL) {
            // Déjà dans le bon format
            return image;
          } else if (typeof image === 'string') {
            // Ancien format string URL
            const urlMatch = image.match(/properties\/(.+\.jpg)/);
            if (urlMatch) {
              // URL Firebase Storage
              const fileName = `properties/${urlMatch[1]}`;
              return {
                filePATH: fileName,
                fileURL: image
              };
            } else {
              // URL externe ou locale
              return {
                filePATH: `external/${doc.id}_${index}_migrated.jpg`,
                fileURL: image
              };
            }
          } else {
            // Format inconnu
            console.log(`     ⚠️  Format inconnu pour image ${index}: ${typeof image}`);
            return {
              filePATH: `unknown/${doc.id}_${index}_unknown.jpg`,
              fileURL: String(image)
            };
          }
        });
        
        // Mettre à jour la propriété
        await doc.ref.update({
          images: migratedImages,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          migratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('   ✅ Migration réussie');
        console.log(`   📊 ${migratedImages.length} images migrées\n`);
        migratedCount++;
        
      } catch (error) {
        console.log(`   ❌ Erreur migration: ${error.message}\n`);
        errorCount++;
      }
    }
    
    console.log('📊 RÉSULTATS DE LA MIGRATION:');
    console.log(`   Total propriétés: ${snapshot.size}`);
    console.log(`   ✅ Migrées: ${migratedCount}`);
    console.log(`   ✨ Déjà migrées: ${alreadyMigratedCount}`);
    console.log(`   ⚪ Sans images: ${noImagesCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    
    if (migratedCount > 0) {
      console.log('\n🎉 Migration terminée !');
      console.log('   Toutes les images utilisent maintenant la structure {filePath, fileUrl}');
    } else {
      console.log('\n✅ Aucune migration nécessaire');
      console.log('   Toutes les propriétés utilisent déjà la nouvelle structure');
    }
    
    // Vérification finale
    console.log('\n🔍 VÉRIFICATION FINALE:');
    const finalSnapshot = await db.collection('properties').get();
    let newFormatCount = 0;
    let oldFormatCount = 0;
    
    finalSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.images && data.images.length > 0) {
        const isNewFormat = data.images.every(img => 
          typeof img === 'object' && img.filePATH && img.fileURL
        );
        if (isNewFormat) {
          newFormatCount++;
        } else {
          oldFormatCount++;
        }
      }
    });
    
    console.log(`   ✅ Nouveau format {filePath, fileUrl}: ${newFormatCount} propriétés`);
    console.log(`   ❌ Ancien format: ${oldFormatCount} propriétés`);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

migrateImageStructure(); 