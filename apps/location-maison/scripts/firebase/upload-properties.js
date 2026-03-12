const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

function parseCliArgs(argv = []) {
  return argv.reduce((acc, arg, index, all) => {
    if (!arg.startsWith('--')) return acc;
    const key = arg.slice(2);
    const next = all[index + 1];
    acc[key] = next && !next.startsWith('--') ? next : true;
    return acc;
  }, {});
}

class FirebasePropertyUploader {
  constructor() {
    this.baseDir = __dirname;
    const cliArgs = parseCliArgs(process.argv.slice(2));
    const inputOverride = cliArgs.input || process.env.INPUT_FILE;

    // Utiliser le nouveau fichier avec les images locales
    this.inputFile = inputOverride
      ? path.resolve(process.cwd(), String(inputOverride))
      : path.join(__dirname, '..', 'apify-facebook-cursor', 'properties-extracted-combined-with-local-images.json');
    this.imagesDir = path.join(__dirname, '..', 'download-img', 'images');
    this.outputFile = path.join(this.baseDir, 'processed-properties.json');
    
    // Statistiques
    this.uploadedImages = 0;
    this.savedProperties = 0;
    this.errors = 0;
    this.processedContacts = 0;
    this.projectId = '';
    this.serviceAccountEmail = '';
  }

  async initialize() {
    console.log('🚀 Initialisation Firebase Admin...\n');
    
    try {
      // Charger les variables d'environnement
      require('dotenv').config();
      
      // Vérifier et afficher l'environnement
      const serviceAccount = require('./firebase-config.js');
      const projectId = serviceAccount.projectId;
      this.projectId = projectId;
      this.serviceAccountEmail = serviceAccount.clientEmail || '';
      const isProduction = projectId === 'location-maison-prod-167da';
      const isDevelopment = projectId?.includes('-dev');
      
      console.log('🌍 ENVIRONNEMENT DÉTECTÉ:');
      console.log(`   Project ID: ${projectId}`);
      console.log(`   Service account: ${this.serviceAccountEmail}`);
      console.log(`   Mode: ${isProduction ? '🔴 PRODUCTION' : isDevelopment ? '🟡 DÉVELOPPEMENT' : '❓ INCONNU'}`);
      console.log(`   Storage: ${process.env.FIREBASE_STORAGE_BUCKET}\n`);
      
      if (!projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('❌ Configuration Firebase incomplète - vérifiez le fichier .env');
      }

      const serviceAccountProjectMatch = String(this.serviceAccountEmail).match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
      const serviceAccountProjectId = serviceAccountProjectMatch?.[1] || '';
      if (serviceAccountProjectId && projectId && serviceAccountProjectId !== projectId) {
        throw new Error(
          `Configuration incohérente: FIREBASE_PROJECT_ID=${projectId} mais FIREBASE_CLIENT_EMAIL appartient à ${serviceAccountProjectId}. ` +
          `Charge le bon fichier d'environnement (ex: DOTENV_CONFIG_PATH=.env.local.prod).`
        );
      }
      
      // Confirmation pour la production
      if (isProduction) {
        console.log('⚠️  ATTENTION: Vous êtes sur la PRODUCTION !');
        console.log('   Les données seront sauvegardées dans la base de données réelle.\n');
      }
      
      // Initialiser Firebase Admin
      if (!admin.apps.length) {
        const storageBucket =
          process.env.FIREBASE_STORAGE_BUCKET ||
          `${projectId}.firebasestorage.app`;

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket
        });
      }
      
      this.db = admin.firestore();
      this.bucket = admin.storage().bucket();

      await this.verifyFirestoreWriteAccess();
      
      console.log('✅ Firebase Admin initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Firebase:', error.message);
      throw error;
    }
  }

  async verifyFirestoreWriteAccess() {
    const probeCollection = '__script_healthchecks';
    const probeRef = this.db.collection(probeCollection).doc(`upload-properties-${Date.now()}`);

    try {
      await probeRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'upload-properties-script',
      });
      await probeRef.delete();
      console.log('✅ Permissions Firestore validées\n');
    } catch (error) {
      const message = error?.message || 'Erreur inconnue';
      const isPermissionIssue = /PERMISSION_DENIED|Missing or insufficient permissions/i.test(message);

      if (isPermissionIssue) {
        throw new Error(
          `Permissions Firestore insuffisantes pour ${this.serviceAccountEmail} sur ${this.projectId}. ` +
          `Ajoute au minimum le rôle IAM "Cloud Datastore User" (roles/datastore.user), puis relance le script. ` +
          `Détail: ${message}`
        );
      }

      throw error;
    }
  }

  async loadProperties() {
    console.log('📄 Chargement du fichier JSON...');
    console.log(`   Source: ${this.inputFile}`);
    const data = await fs.readFile(this.inputFile, 'utf8');
    const jsonData = JSON.parse(data);
    // Le fichier peut avoir une structure { properties: [...] } ou être directement un tableau
    const properties = jsonData.properties || jsonData;
    console.log(`✅ ${properties.length} propriétés trouvées\n`);
    return properties;
  }

  processContact(contactStr) {
    if (!contactStr || contactStr.trim() === '' || contactStr === 'non précisé') {
      return { contact: '', contacts: [] };
    }

    // Supprimer les espaces
    const cleanContact = contactStr.replace(/\s+/g, '');
    
    // Détecter plusieurs numéros (séparés par /, - ou d'autres caractères)
    const numbers = cleanContact.split(/[\/\-,;|]+/).filter(num => num.trim().length > 0);
    
    if (numbers.length <= 1) {
      return {
        contact: cleanContact,
        contacts: []
      };
    } else {
      this.processedContacts++;
      return {
        contact: numbers[0], // Premier numéro
        contacts: numbers    // Tous les numéros
      };
    }
  }

  async uploadImage(localImagePath, propertyIndex, imageIndex) {
    try {
      // Support des deux formats : string (chemin relatif) ou objet { filePATH, fileURL }
      let actualLocalPath;
      if (typeof localImagePath === 'string') {
        // Format string : "images/property_0_image_0.jpg"
        actualLocalPath = path.join(this.imagesDir, path.basename(localImagePath));
      } else if (localImagePath && localImagePath.filePATH) {
        // Format objet : { filePATH: "images/...", fileURL: "..." }
        actualLocalPath = path.join(this.imagesDir, path.basename(localImagePath.filePATH));
      } else {
        throw new Error('Format d\'image non supporté');
      }
      
      // Vérifier que le fichier existe
      await fs.access(actualLocalPath);
      
      // Nom du fichier dans Firebase Storage
      const fileName = `properties/${propertyIndex}_${imageIndex}_${Date.now()}.jpg`;
      const file = this.bucket.file(fileName);
      
      // Upload du fichier
      await file.save(await fs.readFile(actualLocalPath), {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            propertyIndex: propertyIndex.toString(),
            imageIndex: imageIndex.toString()
          }
        }
      });
      
      // Rendre le fichier public
      await file.makePublic();
      
      // Retourner un objet avec filePATH et fileURL
      const filePATH = fileName;
      const fileURL = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
      
      this.uploadedImages++;
      
      return {
        filePATH: filePATH,
        fileURL: fileURL
      };
      
    } catch (error) {
      console.log(`   ❌ Erreur upload image ${localImagePath}: ${error.message}`);
      this.errors++;
      return null;
    }
  }

  async processProperty(property, propertyIndex) {
    console.log(`📝 [${propertyIndex + 1}] Traitement: ${property.title}`);
    
    // 1. Traiter les contacts
    const { contact, contacts } = this.processContact(property.contact);
    
    // 2. Upload des images
    const firebaseImages = [];
    
    if (property.images && property.images.length > 0) {
      console.log(`   📸 Upload de ${property.images.length} images...`);
      
      for (let i = 0; i < property.images.length; i++) {
        const image = property.images[i];
        
        // Support des deux formats : string ou objet { filePATH, fileURL }
        let localImagePath = null;
        let externalUrl = null;
        
        if (typeof image === 'string') {
          // Format string : chemin local ou URL
          if (image.startsWith('http')) {
            externalUrl = image;
          } else {
            localImagePath = image;
          }
        } else if (image && typeof image === 'object') {
          // Format objet : { filePATH, fileURL }
          // Prioriser filePATH (chemin local) pour l'upload
          localImagePath = image.filePATH && !image.filePATH.startsWith('http') ? image.filePATH : null;
          externalUrl = image.fileURL;
        }
        
        // Si on a un fichier local, toujours l'uploader vers Firebase Storage
        if (localImagePath) {
          const imageObject = await this.uploadImage(localImagePath, propertyIndex, i);
          if (imageObject) {
            firebaseImages.push(imageObject);
            process.stdout.write('.');
          } else {
            // En cas d'échec, garder l'URL externe si disponible
            firebaseImages.push({
              filePATH: `external/${propertyIndex}_${i}_external.jpg`,
              fileURL: externalUrl || localImagePath
            });
          }
        } else if (externalUrl && externalUrl.startsWith('http') && !externalUrl.includes('storage.googleapis.com')) {
          // Pas de fichier local, garder l'URL externe
          firebaseImages.push({
            filePATH: `external/${propertyIndex}_${i}_external.jpg`,
            fileURL: externalUrl
          });
        } else {
          // Fallback : essayer d'uploader avec ce qu'on a
          const imageObject = await this.uploadImage(image, propertyIndex, i);
          if (imageObject) {
            firebaseImages.push(imageObject);
            process.stdout.write('.');
          } else {
            // En cas d'échec total, garder l'image originale
            firebaseImages.push(typeof image === 'object' ? image : {
              filePATH: `external/${propertyIndex}_${i}_external.jpg`,
              fileURL: externalUrl || String(image)
            });
          }
        }
      }
      console.log(`\n   ✅ ${firebaseImages.length}/${property.images.length} images uploadées`);
    }

    // 3. Préparer la propriété pour Firestore avec les types ICreation
    // IMPORTANT: ne jamais stocker l'id du document Firestore dans le payload.
    const { id: _ignoredId, objectID: _ignoredObjectId, ...propertyWithoutId } = property || {};
    const processedProperty = {
      ...propertyWithoutId,
      contact: contact,
      contacts: contacts,
      images: firebaseImages, // URLs Firebase après upload
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: process.env.CREATED_BY || 'facebook_import_script',
      source: 'facebook_import',
      state: 'IN_PROGRESS', // StateCreation
      isActive: true
    };

    // 4. Sauvegarder dans Firestore
    try {
      const docRef = await this.db.collection('properties').add(processedProperty);
      console.log(`   ✅ Propriété sauvegardée: ${docRef.id}\n`);
      this.savedProperties++;
      
      return {
        ...processedProperty,
        id: docRef.id
      };
      
    } catch (error) {
      console.log(`   ❌ Erreur sauvegarde Firestore: ${error.message}\n`);
      if (/PERMISSION_DENIED|Missing or insufficient permissions/i.test(error?.message || '')) {
        throw new Error(`Permissions Firestore refusées durant l'insertion: ${error.message}`);
      }
      this.errors++;
      return null;
    }
  }

  async processAllProperties() {
    const properties = await this.loadProperties();
    const processedProperties = [];
    
    console.log('🔥 Début du traitement Firebase...\n');
    
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const processed = await this.processProperty(property, i);
      
      if (processed) {
        processedProperties.push(processed);
      }
      
      // Pause pour éviter la surcharge
      if (i % 5 === 0 && i > 0) {
        console.log('⏳ Pause de 2 secondes...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return processedProperties;
  }

  async saveProcessedData(properties) {
    console.log('💾 Sauvegarde des données traitées...');
    const jsonData = JSON.stringify(properties, null, 2);
    await fs.writeFile(this.outputFile, jsonData, 'utf8');
    console.log(`✅ Fichier sauvegardé: ${this.outputFile}\n`);
  }

  async run() {
    try {
      await this.initialize();
      const properties = await this.processAllProperties();
      await this.saveProcessedData(properties);
      
      console.log('📊 RÉSULTATS FINAUX:');
      console.log(`✅ Propriétés sauvegardées: ${this.savedProperties}`);
      console.log(`📸 Images uploadées: ${this.uploadedImages}`);
      console.log(`📞 Contacts traités: ${this.processedContacts}`);
      console.log(`❌ Erreurs: ${this.errors}`);
      console.log(`🔥 Collection: properties`);
      console.log(`📁 Stockage: Firebase Storage/properties/`);
      console.log(`📄 Données traitées: ${this.outputFile}`);
      console.log('\n🎉 Upload Firebase terminé !');
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      process.exit(1);
    }
  }
}

// Lancement du script
const uploader = new FirebasePropertyUploader();
uploader.run(); 
