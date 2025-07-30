// Script pour vérifier l'environnement Firebase actuel
const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('🔍 Vérification de l\'environnement Firebase...\n');
  
  try {
    // Vérifier si .env existe
    const envPath = path.join(__dirname, '.env');
    const envExists = fs.existsSync(envPath);
    
    console.log('📁 FICHIERS DISPONIBLES:');
    console.log(`   .env: ${envExists ? '✅' : '❌'}`);
    console.log(`   .env.dev: ${fs.existsSync(path.join(__dirname, '.env.dev')) ? '✅' : '❌'}`);
    console.log(`   .env.prod: ${fs.existsSync(path.join(__dirname, '.env.prod')) ? '✅' : '❌'}`);
    
    if (envExists) {
      console.log('\n🌍 ENVIRONNEMENT ACTUEL:');
      
      // Charger la configuration
      require('dotenv').config({ path: envPath });
      const serviceAccount = require('./firebase-config.js');
      
      const projectId = serviceAccount.projectId;
      const isProduction = projectId === 'location-maison-prod-167da';
      const isDevelopment = projectId?.includes('-dev');
      
      console.log(`   Project ID: ${projectId || '❌ Non défini'}`);
      console.log(`   Client Email: ${serviceAccount.clientEmail ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`   Private Key: ${serviceAccount.privateKey ? '✅ Configuré' : '❌ Manquant'}`);
      console.log(`   Storage Bucket: ${process.env.FIREBASE_STORAGE_BUCKET || '❌ Non défini'}`);
      
      console.log(`\n🎯 MODE: ${isProduction ? '🔴 PRODUCTION' : isDevelopment ? '🟡 DÉVELOPPEMENT' : '❓ INCONNU'}`);
      
      if (isProduction) {
        console.log('\n⚠️  ATTENTION: Configuration PRODUCTION détectée !');
        console.log('   Les données seront sauvegardées dans la base réelle.');
      }
      
    } else {
      console.log('\n❌ Aucun fichier .env trouvé !');
      console.log('\n🔧 COMMANDES DISPONIBLES:');
      console.log('   npm run dev  - Configure l\'environnement DEV et lance l\'upload');
      console.log('   npm run prod - Configure l\'environnement PROD et lance l\'upload');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  }
  
  console.log('\n📝 AIDE:');
  console.log('   npm run dev    - Utiliser l\'environnement de développement');
  console.log('   npm run prod   - Utiliser l\'environnement de production');
  console.log('   npm run check  - Vérifier la configuration actuelle');
}

// Lancement
checkEnvironment(); 