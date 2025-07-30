// Script pour vérifier la conformité avec l'interface ICreation
const admin = require('firebase-admin');

async function verifyICreationCompliance() {
  console.log('🔍 Vérification conformité ICreation...\n');
  
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
    
    // Récupérer un échantillon de propriétés
    console.log('📄 Chargement échantillon de propriétés...');
    const snapshot = await db.collection('properties')
      .where('source', '==', 'facebook_import')
      .limit(10)
      .get();
    
    console.log(`✅ ${snapshot.size} propriétés Facebook analysées\n`);
    
    let compliantCount = 0;
    let issuesFound = [];
    
    console.log('🔍 VÉRIFICATION CONFORMITÉ ICreation:\n');
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const issues = [];
      
      console.log(`📝 ${data.title?.substring(0, 40)}...`);
      console.log(`   ID: ${doc.id}`);
      
      // Vérifier chaque champ requis par ICreation
      const checks = {
        'createdAt': data.createdAt !== undefined,
        'updatedAt': data.updatedAt !== undefined,
        'state': data.state !== undefined && ['ARCHIVED', 'IN_PROGRESS'].includes(data.state),
        'createdBy': data.createdBy !== undefined && data.createdBy !== null
      };
      
      // Afficher le statut de chaque champ
      Object.entries(checks).forEach(([field, isValid]) => {
        const status = isValid ? '✅' : '❌';
        const value = data[field];
        console.log(`   ${status} ${field}: ${value || 'MANQUANT'}`);
        
        if (!isValid) {
          issues.push(field);
        }
      });
      
      // Vérifications spéciales
      if (data.state && !['ARCHIVED', 'IN_PROGRESS'].includes(data.state)) {
        console.log(`   ⚠️  State invalide: "${data.state}" (doit être ARCHIVED ou IN_PROGRESS)`);
        issues.push('state_invalid');
      }
      
      if (issues.length === 0) {
        compliantCount++;
        console.log('   🎉 CONFORME ICreation');
      } else {
        console.log(`   ❌ NON CONFORME: ${issues.join(', ')}`);
        issuesFound.push({
          id: doc.id,
          title: data.title,
          issues: issues
        });
      }
      console.log('');
    }
    
    console.log('📊 RÉSULTATS CONFORMITÉ:');
    console.log(`   ✅ Propriétés conformes: ${compliantCount}/${snapshot.size}`);
    console.log(`   ❌ Propriétés non conformes: ${issuesFound.length}`);
    
    if (issuesFound.length > 0) {
      console.log('\n🔧 PROBLÈMES DÉTECTÉS:');
      issuesFound.forEach(issue => {
        console.log(`   • ${issue.title} (${issue.id}): ${issue.issues.join(', ')}`);
      });
      
      console.log('\n💡 RECOMMANDATIONS:');
      console.log('   Relancez: npm run fix:state');
    } else {
      console.log('\n🎉 TOUTES LES PROPRIÉTÉS SONT CONFORMES !');
      console.log('   Interface ICreation respectée à 100%');
    }
    
    // Vérification supplémentaire des types
    console.log('\n📋 VÉRIFICATION TYPES StateCreation:');
    const stateSnapshot = await db.collection('properties').get();
    const stateStats = {};
    
    stateSnapshot.forEach(doc => {
      const state = doc.data().state;
      stateStats[state] = (stateStats[state] || 0) + 1;
    });
    
    console.log('   États trouvés:');
    Object.entries(stateStats).forEach(([state, count]) => {
      const isValid = ['ARCHIVED', 'IN_PROGRESS'].includes(state) || state === undefined;
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} "${state}": ${count} propriétés`);
    });
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

verifyICreationCompliance(); 