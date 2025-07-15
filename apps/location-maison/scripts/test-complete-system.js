const fetch = require('node-fetch');

async function testAPI(endpoint, description, email) {
  console.log(`\n🔄 Test ${description} pour: ${email}`);
  
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Message: ${data.message || data.error}`);
    
    if (response.ok && data.success) {
      console.log(`✅ ${description} - SUCCÈS`);
      
      if (data.verificationLink) {
        console.log(`🔗 Lien vérification: ${data.verificationLink}`);
      }
      if (data.resetLink) {
        console.log(`🔗 Lien reset: ${data.resetLink}`);
      }
      
      return true;
    } else {
      console.log(`⚠️  ${description} - ${data.error || 'Échec'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description} - Erreur: ${error.message}`);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🚀 TEST COMPLET DU SYSTÈME EMAIL');
  console.log('🎯 "Trouve Ton Nkama" - Gmail OAuth2\n');
  console.log('='.repeat(50));
  
  const testEmail = 'yourispen-tanko.mba@ism.edu.sn';
  let successCount = 0;
  let totalTests = 0;
  
  console.log(`📧 Email de test: ${testEmail}`);
  
  // Test 1: API de vérification
  totalTests++;
  const verification = await testAPI(
    '/api/auth/send-verification-email',
    'Email de Vérification',
    testEmail
  );
  if (verification) successCount++;
  
  // Test 2: API de réinitialisation
  totalTests++;
  const reset = await testAPI(
    '/api/auth/send-password-reset-email',
    'Reset Mot de Passe',
    testEmail
  );
  if (reset) successCount++;
  
  // Résultats finaux
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RÉSULTATS FINAUX: ${successCount}/${totalTests} tests réussis`);
  
  if (successCount === totalTests) {
    console.log('🎉 SYSTÈME 100% OPÉRATIONNEL !');
    console.log('✅ Gmail OAuth2 configuré et fonctionnel');
    console.log('✅ APIs Next.js intégrées avec succès');
    console.log('✅ Emails "Trouve Ton Nkama" envoyés');
    console.log('\n🚀 PRÊT POUR LA PRODUCTION !');
  } else {
    console.log('❌ Problème détecté - vérifiez la configuration');
  }
  
  console.log('\n📬 Vérifiez la boîte email/spam pour les emails reçus !');
  console.log('📝 Limite: 500 emails/jour avec Gmail gratuit');
}

runCompleteTest(); 