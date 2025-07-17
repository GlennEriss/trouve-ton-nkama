#!/usr/bin/env node

/**
 * Script pour tester l'API d'envoi d'emails
 * Usage: node scripts/test-email-api.js [email] [type]
 * 
 * Types: generic (défaut), reset, verification
 * 
 * Exemples:
 * node scripts/test-email-api.js test@example.com generic
 * node scripts/test-email-api.js test@example.com reset
 * node scripts/test-email-api.js test@example.com verification
 */

const args = process.argv.slice(2);
const email = args[0] || 'test@example.com';
const templateType = args[1] || 'generic';

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/test-email`;

async function testEmailAPI() {
  console.log('🚀 Test de l\'API d\'envoi d\'emails');
  console.log('=' .repeat(40));
  console.log(`📧 Email: ${email}`);
  console.log(`📋 Template: ${templateType}`);
  console.log(`🌐 URL: ${API_ENDPOINT}`);
  console.log('');

  try {
    console.log('⏳ Envoi de la requête...');
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        templateType,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Succès !');
      console.log('');
      console.log('📊 Détails de l\'envoi:');
      console.log(`   From: ${data.details.from}`);
      console.log(`   To: ${data.details.to}`);
      console.log(`   Subject: ${data.details.subject}`);
      console.log(`   Template: ${data.details.templateType}`);
      console.log(`   Timestamp: ${data.details.timestamp}`);
      
      if (data.testLink) {
        console.log(`   Test Link: ${data.testLink}`);
      }
      
      if (data.htmlPreview) {
        console.log('');
        console.log('📄 Aperçu HTML (premiers 500 caractères):');
        console.log(data.htmlPreview);
      }
      
      console.log('');
      console.log('💡 Vérifiez votre boîte email !');
      
    } else {
      console.log('❌ Erreur');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.error}`);
      
      if (data.details) {
        console.log(`   Détails: ${data.details}`);
      }
      
      // Suggestions selon le type d'erreur
      if (response.status === 503 && data.error.includes('Gmail')) {
        console.log('');
        console.log('🔧 Suggestions:');
        console.log('   1. Vérifiez vos variables d\'environnement Gmail');
        console.log('   2. Assurez-vous que le service est démarré');
        console.log('   3. Vérifiez les tokens OAuth2');
      }
    }

  } catch (error) {
    console.log('💥 Erreur de connexion');
    console.log(`   Message: ${error.message}`);
    console.log('');
    console.log('🔧 Vérifications:');
    console.log('   1. Le serveur est-il démarré ? (npm run dev)');
    console.log('   2. L\'URL est-elle correcte ?');
    console.log('   3. Y a-t-il une connexion internet ?');
  }

  console.log('');
  console.log('=' .repeat(40));
}

// Affichage de l'aide
if (args.includes('--help') || args.includes('-h')) {
  console.log('📧 Script de test de l\'API d\'envoi d\'emails');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/test-email-api.js [email] [type]');
  console.log('');
  console.log('Arguments:');
  console.log('  email    Adresse email de destination (défaut: test@example.com)');
  console.log('  type     Type de template: generic|reset|verification (défaut: generic)');
  console.log('');
  console.log('Types de templates:');
  console.log('  generic       Email générique pour tester le layout et le logo');
  console.log('  reset         Email de réinitialisation de mot de passe');
  console.log('  verification  Email de vérification d\'adresse');
  console.log('');
  console.log('Exemples:');
  console.log('  node scripts/test-email-api.js');
  console.log('  node scripts/test-email-api.js mon.email@test.com');
  console.log('  node scripts/test-email-api.js test@example.com generic');
  console.log('  node scripts/test-email-api.js test@example.com reset');
  console.log('  node scripts/test-email-api.js test@example.com verification');
  console.log('');
  console.log('Variables d\'environnement:');
  console.log('  NEXT_PUBLIC_HOST  URL de base (défaut: http://localhost:3000)');
  process.exit(0);
}

// Exécution du test
testEmailAPI(); 