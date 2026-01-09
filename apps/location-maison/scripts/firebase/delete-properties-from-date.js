// Script pour supprimer toutes les propriétés créées le 5 janvier 2026
const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

async function deletePropertiesFromDate() {
  console.log('🗑️  Suppression des propriétés créées le 5 janvier 2026...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Initialiser Firebase
    const serviceAccount = require('./firebase-config.js');
    const projectId = serviceAccount.projectId;
    const isProduction = projectId === 'location-maison-prod-167da';
    
    console.log('🌍 ENVIRONNEMENT:');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Mode: ${isProduction ? '🔴 PRODUCTION' : '🟡 DÉVELOPPEMENT'}`);
    
    if (isProduction) {
      console.log('\n⚠️  ATTENTION: Vous êtes sur la PRODUCTION !');
      console.log('   Les données seront définitivement supprimées.\n');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'location-maison-prod-167da.firebasestorage.app'
      });
    }
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    // Date cible : 5 janvier 2026
    const targetDate = new Date('2026-01-05T00:00:00Z');
    const startOfDay = admin.firestore.Timestamp.fromDate(targetDate);
    const endOfDay = admin.firestore.Timestamp.fromDate(new Date('2026-01-05T23:59:59Z'));
    
    console.log(`📅 Recherche des propriétés créées le 5 janvier 2026`);
    console.log(`   Début: ${startOfDay.toDate().toISOString()}`);
    console.log(`   Fin: ${endOfDay.toDate().toISOString()}\n`);
    
    // Récupérer toutes les propriétés créées ce jour
    const propertiesRef = db.collection('properties');
    const snapshot = await propertiesRef
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    console.log(`📊 ${snapshot.size} propriétés trouvées\n`);
    
    if (snapshot.size === 0) {
      console.log('✅ Aucune propriété à supprimer.');
      return;
    }
    
    // Supprimer les images dans Firebase Storage et les propriétés
    let deletedProperties = 0;
    let deletedImages = 0;
    let errors = 0;
    
    const batch = db.batch();
    const batchSize = 500; // Limite Firestore
    
    for (let i = 0; i < snapshot.docs.length; i++) {
      const doc = snapshot.docs[i];
      const data = doc.data();
      
      console.log(`\n🗑️  [${i + 1}/${snapshot.size}] Suppression: ${data.title || doc.id}`);
      
      // Supprimer les images dans Storage
      if (data.images && Array.isArray(data.images)) {
        for (const image of data.images) {
          let imagePath = null;
          
          // Extraire le chemin de l'image
          if (typeof image === 'object' && image.filePATH) {
            imagePath = image.filePATH;
          } else if (typeof image === 'string' && image.includes('storage.googleapis.com')) {
            // Extraire le chemin depuis l'URL
            const urlMatch = image.match(/\/o\/(.+?)\?/) || image.match(/properties\/(.+)/);
            if (urlMatch) {
              imagePath = urlMatch[1].replace(/%2F/g, '/');
            }
          }
          
          if (imagePath && imagePath.startsWith('properties/')) {
            try {
              const file = bucket.file(imagePath);
              await file.delete();
              deletedImages++;
              console.log(`   🖼️  Image supprimée: ${imagePath}`);
            } catch (error) {
              // L'image n'existe peut-être pas ou a déjà été supprimée
              console.log(`   ⚠️  Image non trouvée: ${imagePath}`);
            }
          }
        }
      }
      
      // Ajouter la suppression au batch
      batch.delete(doc.ref);
      deletedProperties++;
      
      // Exécuter le batch tous les 500 documents (limite Firestore)
      if ((i + 1) % batchSize === 0) {
        console.log(`\n💾 Commit du batch (${batchSize} documents)...`);
        await batch.commit();
        console.log(`✅ Batch committé\n`);
      }
    }
    
    // Commiter les documents restants
    if (snapshot.size % batchSize !== 0) {
      console.log(`\n💾 Commit du batch final...`);
      await batch.commit();
    }
    
    console.log(`\n📊 RÉSULTATS:`);
    console.log(`✅ Propriétés supprimées: ${deletedProperties}`);
    console.log(`🖼️  Images supprimées: ${deletedImages}`);
    console.log(`❌ Erreurs: ${errors}`);
    console.log(`\n🎉 Suppression terminée !`);
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Lancer le script
deletePropertiesFromDate();

