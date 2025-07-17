// Forcer l'envoi réel d'emails en développement
process.env.FORCE_REAL_EMAILS = 'true';

const fetch = require('node-fetch');

async function testRealEmails() {
  console.log('🚀 TEST EMAILS RÉELS EN DÉVELOPPEMENT');
  console.log('====================================\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   FORCE_REAL_EMAILS: ${process.env.FORCE_REAL_EMAILS}`);
  console.log('');

  const testEmail = 'yourispen-tanko.mba@ism.edu.sn';
  
  // Test 1: Email de vérification via l'APPLICATION
  console.log('📧 Test 1: Email de vérification (APPLICATION)...');
  try {
    const response1 = await fetch('http://localhost:3000/api/auth/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const data1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Résultat: ${data1.success ? '✅ ENVOYÉ POUR DE VRAI' : '❌ ' + (data1.error || 'Échec')}`);
    
    if (data1.verificationLink) {
      console.log(`   🔗 Lien: ${data1.verificationLink}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  console.log('');

  // Test 2: Email de reset via l'APPLICATION
  console.log('📧 Test 2: Email de reset (APPLICATION)...');
  try {
    const response2 = await fetch('http://localhost:3000/api/auth/send-password-reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const data2 = await response2.json();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Résultat: ${data2.success ? '✅ ENVOYÉ POUR DE VRAI' : '❌ ' + (data2.error || 'Échec')}`);
    
    if (data2.resetLink) {
      console.log(`   🔗 Lien: ${data2.resetLink}`);
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  console.log('\n🎯 RÉSULTAT:');
  console.log('Les emails de votre APPLICATION devraient maintenant arriver !');
  console.log('📧 Vérifiez votre boîte email/spam dans les 2-5 minutes.');
  
  console.log('\n💡 POUR ACTIVER EN PERMANENCE:');
  console.log('Ajoutez FORCE_REAL_EMAILS=true à votre fichier .env.local');
}

testRealEmails(); 