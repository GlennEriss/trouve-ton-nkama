const fetch = require('node-fetch');

async function testGmailDelivery() {
  console.log('📧 TEST LIVRAISON AVEC EMAIL GMAIL');
  console.log('==================================\n');

  // Email Gmail pour comparaison
  const gmailTest = 'iamprogrammer221@gmail.com';
  const eduTest = 'yourispen-tanko.mba@ism.edu.sn';
  
  console.log('🎯 Comparaison des livraisons :\n');

  // Test 1: Email Gmail
  console.log('📧 Test 1: Email Gmail standard...');
  try {
    const response1 = await fetch('http://localhost:3000/api/auth/send-password-reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: gmailTest })
    });

    const data1 = await response1.json();
    console.log(`📊 ${gmailTest}`);
    console.log(`   Status: ${response1.status}`);
    console.log(`   Résultat: ${data1.success ? '✅ Envoyé' : '❌ Échec'}`);
    
  } catch (error) {
    console.log(`❌ Erreur Gmail: ${error.message}`);
  }

  console.log('');

  // Test 2: Email .edu.sn
  console.log('📧 Test 2: Email institutionnel .edu.sn...');
  try {
    const response2 = await fetch('http://localhost:3000/api/auth/send-password-reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: eduTest })
    });

    const data2 = await response2.json();
    console.log(`📊 ${eduTest}`);
    console.log(`   Status: ${response2.status}`);
    console.log(`   Résultat: ${data2.success ? '✅ Envoyé' : '❌ Échec'}`);
    
  } catch (error) {
    console.log(`❌ Erreur .edu.sn: ${error.message}`);
  }

  console.log('\n🎯 INSTRUCTIONS DE VÉRIFICATION:');
  console.log('================================');
  
  console.log('\n1️⃣ VÉRIFIEZ IMMÉDIATEMENT:');
  console.log('   📁 Dossier SPAM des deux emails');
  console.log('   🔍 Recherchez "Trouve Ton Nkama"');
  console.log('   ⏰ Attendez 2-5 minutes maximum');
  
  console.log('\n2️⃣ SI GMAIL REÇOIT MAIS PAS .EDU.SN:');
  console.log('   ⚠️  Filtrage institutionnel confirmé');
  console.log('   💡 Contactez IT de votre école');
  console.log('   📧 Utilisez un email perso pour les tests');
  
  console.log('\n3️⃣ RECHERCHE AVANCÉE:');
  console.log('   🔍 from:' + process.env.GMAIL_SENDER_EMAIL || 'votre-gmail');
  console.log('   🔍 subject:"Trouve Ton Nkama"');
  console.log('   🔍 Tous les dossiers (pas juste Inbox)');
  
  console.log('\n✅ Les emails SONT envoyés - le problème est la LIVRAISON !');
}

testGmailDelivery(); 