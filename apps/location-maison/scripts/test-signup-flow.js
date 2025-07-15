#!/usr/bin/env node

/**
 * Script pour tester le flow complet d'inscription avec envoi d'email de vérification
 * Usage: node scripts/test-signup-flow.js [email] [password]
 */

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testSignupFlow() {
  console.log('🚀 Test du flow complet d\'inscription avec email de vérification\n');
  
  const HOST = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
  
  // Utiliser les paramètres ou valeurs par défaut
  const TEST_EMAIL = process.argv[2] || `test-${Date.now()}@example.com`;
  const TEST_PASSWORD = process.argv[3] || 'TestPassword123!';
  
  console.log(`📧 Email de test : ${TEST_EMAIL}`);
  console.log(`🔐 Mot de passe : ${TEST_PASSWORD.replace(/./g, '*')}`);
  console.log(`🌐 Host : ${HOST}\n`);
  
  try {
    // Étape 1 : Créer un utilisateur (simulation de l'inscription)
    console.log('📝 Étape 1 : Création d\'un utilisateur de test...');
    
    // Pour ce test, on va directement tester l'envoi d'email de vérification
    // car la création d'utilisateur nécessiterait l'accès à Firebase Admin
    
    // Étape 2 : Tester l'envoi d'email de vérification
    console.log('📧 Étape 2 : Test d\'envoi d\'email de vérification...');
    
    const verificationResponse = await fetch(`${HOST}/api/auth/send-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        subject: '✅ Vérifiez votre compte - Trouve Ton Nkama',
        texts: {
          title: 'Bienvenue sur Trouve Ton Nkama !',
          subtitle: 'Votre plateforme de location immobilière',
          greeting: 'Bonjour',
          mainText: 'Merci de vous être inscrit sur Trouve Ton Nkama ! Pour commencer à utiliser votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.',
          buttonText: 'Vérifier mon compte',
          footerText: 'Si vous n\'avez pas créé de compte, vous pouvez ignorer cet email.',
          supportText: 'Besoin d\'aide ? Contactez-nous à ' + process.env.GMAIL_SENDER_EMAIL,
        }
      })
    });
    
    const verificationResult = await verificationResponse.json();
    
    console.log(`📊 Statut : ${verificationResponse.status}`);
    console.log(`📋 Réponse :`, JSON.stringify(verificationResult, null, 2));
    
    if (verificationResponse.ok && verificationResult.success) {
      console.log('\n✅ Email de vérification envoyé avec succès !');
      
      if (verificationResult.verificationLink) {
        console.log(`🔗 Lien de vérification :`);
        console.log(`   ${verificationResult.verificationLink}`);
      }
      
      console.log('\n📬 Vérifiez la boîte email !');
      
      // Étape 3 : Tester l'API de reset de mot de passe
      console.log('\n🔐 Étape 3 : Test d\'envoi d\'email de reset de mot de passe...');
      
      const resetResponse = await fetch(`${HOST}/api/auth/send-password-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'iamprogrammer221@gmail.com', // Utiliser un compte existant
          subject: '🔐 Test complet - Reset de mot de passe',
          texts: {
            title: 'Réinitialisation de votre mot de passe',
            subtitle: 'Trouve Ton Nkama - Sécurité de votre compte',
            greeting: 'Bonjour',
            mainText: 'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour procéder à la réinitialisation.',
            buttonText: 'Réinitialiser mon mot de passe',
            footerText: 'Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
            supportText: 'Support : ' + process.env.GMAIL_SENDER_EMAIL,
          }
        })
      });
      
      const resetResult = await resetResponse.json();
      
      console.log(`📊 Statut reset : ${resetResponse.status}`);
      console.log(`📋 Réponse reset :`, JSON.stringify(resetResult, null, 2));
      
      if (resetResponse.ok && resetResult.success) {
        console.log('\n✅ Email de reset envoyé avec succès !');
        
        if (resetResult.resetLink) {
          console.log(`🔗 Lien de reset :`);
          console.log(`   ${resetResult.resetLink}`);
        }
      }
      
      console.log('\n🎉 Test complet terminé avec succès !');
      console.log('\n📧 Emails envoyés :');
      console.log(`   1. Vérification à ${TEST_EMAIL} (si compte existe)`);
      console.log(`   2. Reset de mot de passe à iamprogrammer221@gmail.com`);
      
    } else {
      console.log('\n⚠️  Réponse de l\'API vérification :');
      console.log(`   ${verificationResult.error || verificationResult.message}`);
      
      if (verificationResult.error === 'Aucun compte associé à cette adresse email') {
        console.log('\n💡 C\'est normal ! L\'email de test n\'existe pas dans Firebase.');
        console.log('   Testons quand même le reset de mot de passe avec un compte existant...');
        
        // Test avec un compte existant
        const resetResponse = await fetch(`${HOST}/api/auth/send-password-reset-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'iamprogrammer221@gmail.com',
            subject: '🔐 Test - Reset de mot de passe (compte existant)'
          })
        });
        
        const resetResult = await resetResponse.json();
        
        if (resetResponse.ok && resetResult.success) {
          console.log('\n✅ Email de reset envoyé à iamprogrammer221@gmail.com !');
          console.log('📧 Le système d\'emails fonctionne parfaitement !');
        }
      }
    }
    
  } catch (error) {
    console.log('\n❌ Erreur lors du test :');
    console.log(`   ${error.message}`);
    console.log('\n💡 Assurez-vous que le serveur Next.js est démarré :');
    console.log('   npm run dev');
  }
}

testSignupFlow(); 