// Script pour synchroniser les images entre environnements dev/prod
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

class CrossEnvironmentSync {
  constructor() {
    this.baseDir = __dirname;
    this.imagesDir = path.join(__dirname, '..', 'download-img', 'images');
    this.processedFile = path.join(this.baseDir, 'processed-properties.json');
    this.syncedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  async initialize() {
    console.log('🔄 Synchronisation cross-environnement...\n');
    
    try {
      // Charger les variables d'environnement
      require('dotenv').config();
      
      // Vérifier l'environnement cible
      const serviceAccount = require('./firebase-config.js');
      const projectId = serviceAccount.projectId;
      const isProduction = projectId === 'location-maison-prod-167da';
      const isDevelopment = projectId?.includes('-dev');
      
      console.log('🌍 ENVIRONNEMENT CIBLE:');
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Mode: ${isProduction ? '🔴 PRODUCTION' : isDevelopment ? '🟡 DÉVELOPPEMENT' : '❓ INCONNU'}`);
      console.log(`   Storage: ${process.env.FIREBASE_STORAGE_BUCKET}\n`);
      
      if (isProduction) {
        console.log('⚠️  ATTENTION: Synchronisation vers la PRODUCTION !');
        console.log('   Les images seront uploadées dans le bucket de production.\n');
      }
      
      // Initialiser Firebase Admin
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || projectId + '.appspot.com'
        });
      }
      
      this.db = admin.firestore();
      this.bucket = admin.storage().bucket();
      
      console.log('✅ Firebase Admin initialisé avec succès\n');
      
    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
      throw error;
    }
  }

  async checkImageExists(fileName) {
    try {
      const file = this.bucket.file(fileName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async uploadImageFromLocal(localFileName, targetFileName) {
    try {
      const localPath = path.join(this.imagesDir, localFileName);
      
      // Vérifier que le fichier local existe
      await fs.access(localPath);
      
      const file = this.bucket.file(targetFileName);
      
      // Upload du fichier
      await file.save(await fs.readFile(localPath), {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            syncedFrom: 'cross_environment_sync',
            originalFile: localFileName
          }
        }
      });
      
      // Rendre public
      await file.makePublic();
      
      const filePATH = targetFileName;
      const fileURL = `https://storage.googleapis.com/${this.bucket.name}/${targetFileName}`;
      this.syncedCount++;
      
      return {
        filePATH: filePATH,
        fileURL: fileURL
      };
      
    } catch (error) {
      console.log(`   ❌ Erreur upload: ${error.message}`);
      this.errorCount++;
      return null;
    }
  }

  async syncPropertyImages(property, propertyIndex) {
    console.log(`📝 [${propertyIndex + 1}] Sync: ${property.title}`);
    
    if (!property.images || property.images.length === 0) {
      console.log('   ⚠️  Aucune image à synchroniser\n');
      return property;
    }
    
    const newImages = [];
    
    for (let i = 0; i < property.images.length; i++) {
      const currentImage = property.images[i];
      
      // Si c'est déjà un objet avec filePATH/fileURL, traiter différemment
      if (typeof currentImage === 'object' && currentImage.filePATH && currentImage.fileURL) {
        const fileName = currentImage.filePATH;
        const exists = await this.checkImageExists(fileName);
        
        if (exists) {
          // L'image existe déjà, générer la nouvelle URL pour cet environnement
          const newImageObject = {
            filePATH: fileName,
            fileURL: `https://storage.googleapis.com/${this.bucket.name}/${fileName}`
          };
          newImages.push(newImageObject);
          this.skippedCount++;
          process.stdout.write('✓');
        } else {
          // L'image n'existe pas, essayer de l'uploader depuis les fichiers locaux
          console.log(`\n   📤 Upload manquant: ${fileName}`);
          
          const localFileName = `property_${propertyIndex}_image_${i}.jpg`;
          const newImageObject = await this.uploadImageFromLocal(localFileName, fileName);
          
          if (newImageObject) {
            newImages.push(newImageObject);
            console.log(`   ✅ Synchronisé: ${fileName}`);
          } else {
            // Garder l'ancien objet en cas d'échec
            newImages.push(currentImage);
          }
        }
      } else {
        // Ancien format (string URL) - convertir vers nouveau format
        const currentUrl = currentImage;
        const urlMatch = currentUrl.match(/properties\/(.+\.jpg)/);
        if (!urlMatch) {
          console.log(`   ⚠️  URL non reconnue: ${currentUrl}`);
          // Convertir en objet
          newImages.push({
            filePATH: `external/${propertyIndex}_${i}_legacy.jpg`,
            fileURL: currentUrl
          });
          continue;
        }
        
        const fileName = `properties/${urlMatch[1]}`;
        const exists = await this.checkImageExists(fileName);
        
        if (exists) {
          // L'image existe déjà, convertir vers nouveau format
          const newImageObject = {
            filePATH: fileName,
            fileURL: `https://storage.googleapis.com/${this.bucket.name}/${fileName}`
          };
          newImages.push(newImageObject);
          this.skippedCount++;
          process.stdout.write('✓');
        } else {
          // L'image n'existe pas, essayer de l'uploader
          console.log(`\n   📤 Upload manquant: ${fileName}`);
          
          const localFileName = `property_${propertyIndex}_image_${i}.jpg`;
          const newImageObject = await this.uploadImageFromLocal(localFileName, fileName);
          
          if (newImageObject) {
            newImages.push(newImageObject);
            console.log(`   ✅ Synchronisé: ${fileName}`);
          } else {
            // Convertir l'ancienne URL en objet
            newImages.push({
              filePATH: `external/${propertyIndex}_${i}_fallback.jpg`,
              fileURL: currentUrl
            });
          }
        }
      }
    }
    
    console.log(`\n   📊 ${newImages.length}/${property.images.length} images synchronisées\n`);
    
    return {
      ...property,
      images: newImages,
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
      syncEnvironment: process.env.FIREBASE_PROJECT_ID
    };
  }

  async updateFirestoreProperty(propertyData) {
    try {
      // Chercher la propriété par titre (ou un autre identifiant unique)
      const snapshot = await this.db.collection('properties')
        .where('title', '==', propertyData.title)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log(`   ⚠️  Propriété non trouvée dans Firestore: ${propertyData.title}`);
        return false;
      }
      
      const doc = snapshot.docs[0];
      await doc.ref.update({
        images: propertyData.images,
        lastSync: propertyData.lastSync,
        syncEnvironment: propertyData.syncEnvironment,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Firestore mis à jour: ${doc.id}`);
      return true;
      
    } catch (error) {
      console.log(`   ❌ Erreur Firestore: ${error.message}`);
      return false;
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Charger les propriétés à synchroniser
      console.log('📄 Chargement des propriétés...');
      const data = await fs.readFile(this.processedFile, 'utf8');
      const properties = JSON.parse(data);
      
      console.log(`✅ ${properties.length} propriétés à synchroniser\n`);
      
      const syncedProperties = [];
      
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const syncedProperty = await this.syncPropertyImages(property, i);
        
        // Mettre à jour Firestore
        await this.updateFirestoreProperty(syncedProperty);
        
        syncedProperties.push(syncedProperty);
        
        // Pause pour éviter la surcharge
        if (i % 3 === 0 && i > 0) {
          console.log('⏳ Pause de 2 secondes...\n');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Sauvegarder le résultat
      const outputFile = path.join(this.baseDir, `synced-properties-${Date.now()}.json`);
      await fs.writeFile(outputFile, JSON.stringify(syncedProperties, null, 2), 'utf8');
      
      console.log('📊 RÉSULTATS DE SYNCHRONISATION:');
      console.log(`✅ Images synchronisées: ${this.syncedCount}`);
      console.log(`⚠️  Images déjà présentes: ${this.skippedCount}`);
      console.log(`❌ Erreurs: ${this.errorCount}`);
      console.log(`📄 Fichier de sortie: ${outputFile}`);
      console.log(`🌍 Environnement: ${process.env.FIREBASE_PROJECT_ID}`);
      
      console.log('\n🎉 Synchronisation terminée !');
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }
}

const syncer = new CrossEnvironmentSync();
syncer.run(); 