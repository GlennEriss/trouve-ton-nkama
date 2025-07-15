const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function findMyEmails() {
  console.log('🔍 TROUVONS VOS EMAILS !');
  console.log('========================\n');
  
  console.log('📧 Donnez-moi un email que vous consultez souvent');
  console.log('   (Gmail, Yahoo, Outlook, etc.)\n');
  
  rl.question('Email de test: ', async (email) => {
    if (!email || !email.includes('@')) {
      console.log('❌ Email invalide');
      rl.close();
      return;
    }
    
    console.log(`\n🚀 Envoi d'un test à: ${email}`);
    console.log('⏰ Heure:', new Date().toLocaleString('fr-FR'));
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/send-password-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('\n✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
        console.log('📬 Vérifiez IMMÉDIATEMENT votre boîte email');
        console.log('📁 Regardez aussi le dossier SPAM');
        console.log('⏱️  L\'email devrait arriver dans 1-3 minutes');
        
        console.log('\n🎯 SI VOUS RECEVEZ CET EMAIL:');
        console.log('   → Vos emails vont probablement dans le SPAM');
        console.log('   → Ou votre serveur .edu.sn filtre les nouveaux expéditeurs');
        
        console.log('\n🎯 SI VOUS NE RECEVEZ PAS CET EMAIL:');
        console.log('   → Problème technique possible (rare)');
        console.log('   → Contactez-moi avec le résultat');
        
      } else {
        console.log('\n❌ Erreur:', data.error || data.message);
      }
      
    } catch (error) {
      console.log('\n❌ Erreur technique:', error.message);
    }
    
    rl.close();
  });
}

findMyEmails(); 