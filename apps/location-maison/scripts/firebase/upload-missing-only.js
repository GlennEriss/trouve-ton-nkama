// Uploader uniquement les propriétés manquantes avec nettoyage des données
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function uploadMissingOnly() {
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
    const bucket = admin.storage().bucket();
    
    // Charger les propriétés source
    const inputFile = path.join(__dirname, '..', 'apify-facebook-cursor', 'properties-extracted-combined-with-local-images.json');
    const data = await fs.readFile(inputFile, 'utf8');
    const jsonData = JSON.parse(data);
    const sourceProperties = jsonData.properties || jsonData;
    
    // Récupérer les propriétés déjà uploadées
    const today = new Date('2026-01-05T00:00:00Z');
    const startOfDay = admin.firestore.Timestamp.fromDate(today);
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date('2026-01-05T23:59:59Z'));
    
    const snapshot = await db.collection('properties')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const uploadedKeys = new Set();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const key = `${data.title || ''}_${data.price || 0}`;
      uploadedKeys.add(key);
    });
    
    // Trouver les propriétés manquantes
    const missing = sourceProperties.filter((prop) => {
      const key = `${prop.title || ''}_${prop.price || 0}`;
      return !uploadedKeys.has(key);
    });
    
    console.log(`📊 ${missing.length} propriétés manquantes à uploader\n`);
    
    const imagesDir = path.join(__dirname, '..', 'download-img', 'images');
    let uploaded = 0;
    let errors = 0;
    
    for (let i = 0; i < missing.length; i++) {
      const property = missing[i];
      console.log(`\n📝 [${i + 1}/${missing.length}] ${property.title}`);
      
      try {
        // Nettoyer les données
        const cleanProperty = {
          ...property,
          // Supprimer les champs undefined/null problématiques
          _source: property._source || {},
          tags: property.tags || [],
          images: property.images || [],
          // S'assurer que les valeurs numériques sont valides
          price: typeof property.price === 'number' ? property.price : 0,
          area: typeof property.area === 'number' ? property.area : 0,
          // Nettoyer les chaînes de caractères
          title: String(property.title || '').substring(0, 500), // Limiter la longueur
          description: String(property.description || '').substring(0, 10000),
          contact: String(property.contact || ''),
          street: String(property.street || ''),
          city: String(property.city || ''),
          province: String(property.province || ''),
          country: String(property.country || ''),
          countryCode: String(property.countryCode || ''),
          status: String(property.status || 'FOR_RENT'),
          typeProperty: String(property.typeProperty || 'Home'),
        };
        
        // Upload des images
        const firebaseImages = [];
        if (property.images && property.images.length > 0) {
          console.log(`   📸 Upload de ${property.images.length} images...`);
          
          for (let j = 0; j < property.images.length; j++) {
            const image = property.images[j];
            let localImagePath = null;
            
            if (typeof image === 'object' && image.filePATH && !image.filePATH.startsWith('http')) {
              localImagePath = image.filePATH;
            }
            
            if (localImagePath) {
              try {
                const actualLocalPath = path.join(imagesDir, path.basename(localImagePath));
                await fs.access(actualLocalPath);
                
                const fileName = `properties/missing_${i}_${j}_${Date.now()}.jpg`;
                const file = bucket.file(fileName);
                
                await file.save(await fs.readFile(actualLocalPath), {
                  metadata: { contentType: 'image/jpeg' }
                });
                
                await file.makePublic();
                
                firebaseImages.push({
                  filePATH: fileName,
                  fileURL: `https://storage.googleapis.com/${bucket.name}/${fileName}`
                });
                process.stdout.write('.');
              } catch (err) {
                console.log(`\n   ⚠️  Erreur image ${j}: ${err.message}`);
              }
            }
          }
          console.log(`\n   ✅ ${firebaseImages.length}/${property.images.length} images uploadées`);
        }
        
        cleanProperty.images = firebaseImages;
        
        // Traiter les contacts
        const contactStr = cleanProperty.contact || '';
        const cleanContact = contactStr.replace(/\s+/g, '');
        const numbers = cleanContact.split(/[\/\-,;|]+/).filter(num => num.trim().length > 0);
        
        cleanProperty.contact = numbers[0] || '';
        cleanProperty.contacts = numbers.length > 1 ? numbers : [];
        
        // Ajouter les métadonnées
        cleanProperty.createdAt = admin.firestore.FieldValue.serverTimestamp();
        cleanProperty.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        cleanProperty.createdBy = process.env.CREATED_BY || 'facebook_import_script';
        cleanProperty.source = 'facebook_import';
        cleanProperty.state = 'IN_PROGRESS';
        cleanProperty.isActive = true;
        
        // Supprimer les champs undefined explicitement
        Object.keys(cleanProperty).forEach(key => {
          if (cleanProperty[key] === undefined) {
            delete cleanProperty[key];
          }
        });
        
        // Sauvegarder
        const docRef = await db.collection('properties').add(cleanProperty);
        console.log(`   ✅ Propriété sauvegardée: ${docRef.id}`);
        uploaded++;
        
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n\n📊 RÉSULTATS:`);
    console.log(`✅ Uploadées: ${uploaded}`);
    console.log(`❌ Erreurs: ${errors}`);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    console.error(error.stack);
  }
}

uploadMissingOnly();

