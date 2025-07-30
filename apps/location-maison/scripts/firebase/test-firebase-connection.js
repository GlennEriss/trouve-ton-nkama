// Test de connexion Firebase sans uploader de données
const admin = require('firebase-admin');
const path = require('path');

async function testFirebaseConnection() {
  console.log('🧪 Test de connexion Firebase...\n');
  
  try {
    // 1. Test de la configuration
    console.log('1️⃣ Test de la configuration...');
    const serviceAccount = require('./firebase-config.js');
    
    console.log('   projectId:', serviceAccount.projectId ? '✅' : '❌');
    console.log('   clientEmail:', serviceAccount.clientEmail ? '✅' : '❌');
    console.log('   privateKey:', serviceAccount.privateKey ? '✅' : '❌');
    
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Configuration Firebase incomplète - vérifiez les variables d\'environnement');
    }
    
    // 2. Test d'initialisation Firebase
    console.log('\n2️⃣ Test d\'initialisation Firebase Admin...');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'location-maison-prod-167da.firebasestorage.app'
      });
    }
    console.log('   ✅ Firebase Admin initialisé');
    
    // 3. Test de connexion Firestore
    console.log('\n3️⃣ Test de connexion Firestore...');
    const db = admin.firestore();
    
    // Test lecture (collection existante)
    const testCollection = await db.collection('properties').limit(1).get();
    console.log(`   ✅ Firestore connecté (${testCollection.size} documents trouvés dans properties)`);
    
    // 4. Test Storage
    console.log('\n4️⃣ Test de connexion Firebase Storage...');
    const bucket = admin.storage().bucket();
    const [exists] = await bucket.exists();
    console.log(`   ✅ Storage connecté (bucket existe: ${exists})`);
    
    console.log('\n🎉 Tous les tests passés ! Firebase est prêt.');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n🔧 Vérifications à faire:');
    console.log('   1. Variables d\'environnement dans .env');
    console.log('   2. Permissions Firebase Admin');
    console.log('   3. Connexion internet');
    process.exit(1);
  }
}

// Lancement du test
testFirebaseConnection(); 