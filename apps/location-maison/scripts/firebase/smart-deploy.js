// Script intelligent pour déploiement cross-environnement
const admin = require('firebase-admin');
const { execSync } = require('child_process');

async function smartDeploy() {
  console.log('🧠 Déploiement intelligent cross-environnement...\n');
  
  try {
    // Charger les variables d'environnement
    require('dotenv').config();
    
    // Analyser l'environnement
    const serviceAccount = require('./firebase-config.js');
    const projectId = serviceAccount.projectId; 
    const isProduction = projectId === 'location-maison-prod-167da';
    const isDevelopment = projectId?.includes('-dev');
    
    console.log('🌍 ENVIRONNEMENT DÉTECTÉ:');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Mode: ${isProduction ? '🔴 PRODUCTION' : isDevelopment ? '🟡 DÉVELOPPEMENT' : '❓ INCONNU'}`);
    
    // Initialiser Firebase pour vérifier l'état
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || projectId + '.appspot.com'
      });
    }
    
    const db = admin.firestore();
    
    // Vérifier s'il y a déjà des propriétés dans cet environnement
    const snapshot = await db.collection('properties').limit(1).get();
    const hasExistingData = !snapshot.empty;
    
    console.log(`📊 Données existantes: ${hasExistingData ? 'OUI' : 'NON'}`);
    
    if (hasExistingData) {
      console.log('\n🔄 SYNCHRONISATION CROSS-ENVIRONNEMENT');
      console.log('   Des données existent déjà. Lancement de la synchronisation...\n');
      
      // Lancer la synchronisation cross-environnement
      execSync('node sync-cross-environment.js', { stdio: 'inherit' });
      
    } else {
      console.log('\n📤 PREMIER DÉPLOIEMENT');
      console.log('   Aucune donnée détectée. Lancement de l\'upload complet...\n');
      
      if (isProduction) {
        console.log('⚠️  ATTENTION: Premier déploiement en PRODUCTION !');
        console.log('   Toutes les propriétés et images seront créées.\n');
      }
      
      // Lancer l'upload complet
      execSync('node upload-properties.js', { stdio: 'inherit' });
    }
    
    console.log('\n🎉 Déploiement intelligent terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

smartDeploy(); 