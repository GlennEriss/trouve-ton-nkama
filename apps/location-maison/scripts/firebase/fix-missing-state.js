// Script pour corriger les propriétés qui n'ont pas de state
const admin = require('firebase-admin');

async function fixMissingState() {
  console.log('🔧 Correction des propriétés sans state...\n');
  
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
    
    console.log('🌍 ENVIRONNEMENT:');
    console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}`);
    console.log(`   Created By: ${process.env.CREATED_BY}\n`);
    
    // Récupérer toutes les propriétés
    console.log('📄 Chargement de toutes les propriétés...');
    const snapshot = await db.collection('properties').get();
    
    console.log(`✅ ${snapshot.size} propriétés trouvées\n`);
    
    let missingStateCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('🔍 Analyse des propriétés...\n');
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const hasState = data.state !== undefined && data.state !== null;
      
      console.log(`📝 ${data.title?.substring(0, 50)}...`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   State actuel: ${data.state || '❌ MANQUANT'}`);
      console.log(`   Source: ${data.source || 'Non défini'}`);
      console.log(`   Created By: ${data.createdBy || 'Non défini'}`);
      
      if (!hasState) {
        missingStateCount++;
        console.log('   🔧 CORRECTION NÉCESSAIRE');
        
        try {
          // Mettre à jour avec les champs manquants
          const updateData = {
            state: 'IN_PROGRESS',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Ajouter createdBy s'il manque
          if (!data.createdBy) {
            updateData.createdBy = process.env.CREATED_BY || 'firebase_script_correction';
          }
          
          await doc.ref.update(updateData);
          
          console.log('   ✅ CORRIGÉ: state → IN_PROGRESS');
          updatedCount++;
          
        } catch (error) {
          console.log(`   ❌ ERREUR: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log('   ✅ State OK');
      }
      console.log('');
    }
    
    console.log('📊 RÉSULTATS DE LA CORRECTION:');
    console.log(`   Total propriétés: ${snapshot.size}`);
    console.log(`   ❌ Sans state: ${missingStateCount}`);
    console.log(`   ✅ Corrigées: ${updatedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   ✨ State OK: ${snapshot.size - missingStateCount}`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Correction terminée !');
      console.log('   Toutes les propriétés ont maintenant un state = "IN_PROGRESS"');
    } else {
      console.log('\n✅ Aucune correction nécessaire');
      console.log('   Toutes les propriétés ont déjà un state défini');
    }
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

fixMissingState(); 