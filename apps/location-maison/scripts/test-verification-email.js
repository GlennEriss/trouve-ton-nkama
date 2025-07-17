#!/usr/bin/env node

/**
 * Script pour tester l'API d'envoi d'email de vérification
 * Usage: node scripts/test-verification-email.js [email]
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testVerificationEmailAPI() {
  console.log('🧪 Test de l\'API d\'envoi d\'email de vérification\n');
  
  const HOST = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
  
  // Utiliser l'email passé en paramètre ou l'email par défaut
  const TEST_EMAIL = process.argv[2] || 'tootylibro@gmail.com';
  
  console.log(`📧 Test d'envoi à : ${TEST_EMAIL}`);
  console.log(`🌐 URL de l'API : ${HOST}/api/auth/send-verification-email\n`);
  
  try {
    const response = await fetch(`${HOST}/api/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        subject: '🧪 Test - Vérifiez votre adresse email',
        texts: {
          title: 'Test de vérification email',
          subtitle: 'Trouve Ton Nkama - Mode Test',
          greeting: 'Bonjour',
          mainText: 'Ceci est un email de test pour vérifier que le système d\'envoi fonctionne correctement.',
          buttonText: 'Vérifier mon email (TEST)',
          footerText: 'Ceci est un email de test. Si vous l\'avez reçu par erreur, ignorez-le.',
          supportText: 'Support technique : ' + process.env.GMAIL_SENDER_EMAIL,
        }
      })
    });
    
    const result = await response.json();
    
    console.log(`📊 Statut HTTP : ${response.status}`);
    console.log(`📋 Réponse :`, JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ Email de vérification envoyé avec succès !');
      
      if (result.verificationLink) {
        console.log(`🔗 Lien de vérification (mode dev) :`);
        console.log(`   ${result.verificationLink}`);
      }
      
      console.log('\n📬 Vérifiez la boîte email de ' + TEST_EMAIL + ' !');
    } else {
      console.log('\n❌ Erreur lors de l\'envoi :');
      console.log(`   ${result.error || result.message || 'Erreur inconnue'}`);
      
      if (result.error === 'Aucun compte associé à cette adresse email') {
        console.log('\n💡 Solution : Créez d\'abord un compte avec cette adresse email');
        console.log('   ou utilisez une adresse email existante dans Firebase Auth');
      }
    }
    
  } catch (error) {
    console.log('\n❌ Erreur de connexion à l\'API :');
    console.log(`   ${error.message}`);
    console.log('\n💡 Assurez-vous que le serveur Next.js est démarré :');
    console.log('   npm run dev');
  }
}

// Attendre quelques secondes pour que le serveur démarre
console.log('⏳ Attente du démarrage du serveur Next.js...');
setTimeout(testVerificationEmailAPI, 3000); 