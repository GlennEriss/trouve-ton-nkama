const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔧 Test de configuration Hostinger SMTP\n');

// Variables d'environnement requises
const requiredEnvVars = [
  'HOSTINGER_EMAIL_USER',
  'HOSTINGER_EMAIL_PASS'
];

console.log('📋 Variables d\'environnement requises:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? '✅' : '❌';
  console.log(`   ${status} ${envVar}: ${value ? 'configuré' : 'manquant'}`);
});

// Vérifier si toutes les variables sont présentes
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.log('\n❌ Variables manquantes:', missingVars.join(', '));
  console.log('\n💡 Ajoutez ces variables dans votre fichier .env:');
  missingVars.forEach(envVar => {
    console.log(`   ${envVar}=votre_valeur`);
  });
  process.exit(1);
}

console.log('\n✅ Toutes les variables d\'environnement sont configurées');

// Créer le transporteur
const transporter = nodemailer.createTransporter({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.HOSTINGER_EMAIL_USER,
    pass: process.env.HOSTINGER_EMAIL_PASS,
  },
});

// Tester la connexion
console.log('\n🔗 Test de connexion au serveur SMTP...');

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Erreur de connexion:', error.message);
    console.log('\n💡 Vérifiez:');
    console.log('   - Vos identifiants Hostinger');
    console.log('   - Votre connexion internet');
    console.log('   - Les paramètres SMTP Hostinger');
    process.exit(1);
  } else {
    console.log('✅ Connexion SMTP réussie!');
    
    // Test d'envoi d'email
    const testEmail = process.env.TEST_EMAIL || process.env.HOSTINGER_EMAIL_USER;
    
    if (testEmail) {
      console.log(`\n📧 Test d'envoi d'email vers: ${testEmail}`);
      
      const mailOptions = {
        from: process.env.HOSTINGER_EMAIL_USER,
        to: testEmail,
        subject: 'Test Hostinger SMTP - Trouve Ton Nkama',
        html: `
          <h2>Test de configuration Hostinger SMTP</h2>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Email envoyé depuis:</strong> ${process.env.HOSTINGER_EMAIL_USER}</p>
          <p>✅ Si vous recevez cet email, la configuration Hostinger SMTP fonctionne correctement!</p>
          <hr>
          <p><em>Trouve Ton Nkama - Plateforme de location immobilière</em></p>
        `,
        text: `
          Test de configuration Hostinger SMTP
          
          Date: ${new Date().toLocaleString()}
          Email envoyé depuis: ${process.env.HOSTINGER_EMAIL_USER}
          
          ✅ Si vous recevez cet email, la configuration Hostinger SMTP fonctionne correctement!
          
          Trouve Ton Nkama - Plateforme de location immobilière
        `
      };

      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log('❌ Erreur lors de l\'envoi:', error.message);
        } else {
          console.log('✅ Email de test envoyé avec succès!');
          console.log('📧 Message ID:', info.messageId);
        }
        process.exit(0);
      });
    } else {
      console.log('\n💡 Pour tester l\'envoi d\'email, ajoutez TEST_EMAIL=votre.email@example.com dans .env');
      process.exit(0);
    }
  }
}); 