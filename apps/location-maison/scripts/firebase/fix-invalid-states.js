// Script pour corriger les états mal formatés (ex: "InProgress" → "IN_PROGRESS")
const admin = require('firebase-admin');

async function fixInvalidStates() {
  console.log('🔧 Correction des états mal formatés...\n');
  
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
    console.log(`   Project: ${process.env.FIREBASE_PROJECT_ID}\n`);
    
    // Mapping des corrections d'états
    const stateCorrections = {
      'InProgress': 'IN_PROGRESS',
      'inProgress': 'IN_PROGRESS', 
      'in_progress': 'IN_PROGRESS',
      'Archived': 'ARCHIVED',
      'archived': 'ARCHIVED'
    };
    
    console.log('📄 Recherche des états mal formatés...');
    
    let correctedCount = 0;
    let errorCount = 0;
    
    // Chercher toutes les propriétés
    const snapshot = await db.collection('properties').get();
    
    console.log(`✅ ${snapshot.size} propriétés analysées\n`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentState = data.state;
      
      if (currentState && stateCorrections[currentState]) {
        const correctState = stateCorrections[currentState];
        
        console.log(`📝 ${data.title?.substring(0, 50)}...`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   État actuel: "${currentState}" → "${correctState}"`);
        
        try {
          await doc.ref.update({
            state: correctState,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log('   ✅ CORRIGÉ\n');
          correctedCount++;
          
        } catch (error) {
          console.log(`   ❌ ERREUR: ${error.message}\n`);
          errorCount++;
        }
      }
    }
    
    console.log('📊 RÉSULTATS DE LA CORRECTION:');
    console.log(`   ✅ États corrigés: ${correctedCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    
    if (correctedCount > 0) {
      console.log('\n🎉 Correction terminée !');
      console.log('   Tous les états respectent maintenant le type StateCreation');
      console.log('   États valides: "IN_PROGRESS" | "ARCHIVED"');
    } else {
      console.log('\n✅ Aucune correction nécessaire');
      console.log('   Tous les états sont déjà conformes');
    }
    
    // Vérification finale
    console.log('\n🔍 VÉRIFICATION FINALE:');
    const finalSnapshot = await db.collection('properties').get();
    const finalStats = {};
    
    finalSnapshot.forEach(doc => {
      const state = doc.data().state;
      finalStats[state] = (finalStats[state] || 0) + 1;
    });
    
    console.log('   États après correction:');
    Object.entries(finalStats).forEach(([state, count]) => {
      const isValid = ['ARCHIVED', 'IN_PROGRESS'].includes(state) || state === undefined;
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} "${state}": ${count} propriétés`);
    });
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

fixInvalidStates(); 