const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

/**
 * Script pour tester la configuration Gmail OAuth2
 * Usage: node scripts/test-gmail-config.js
 */

const requiredEnvVars = [
  'GMAIL_SENDER_EMAIL',
  'GMAIL_OAUTH_CLIENT_ID',
  'GMAIL_OAUTH_CLIENT_SECRET',
  'GMAIL_OAUTH_REFRESH_TOKEN'
];

async function testGmailConfig() {
  console.log('🔍 Vérification de la configuration Gmail OAuth2...\n');

  // 1. Vérifier les variables d'environnement
  console.log('📋 Variables d\'environnement:');
  let configValid = true;
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
    } else {
      console.log(`❌ ${envVar}: MANQUANT`);
      configValid = false;
    }
  }

  if (!configValid) {
    console.log('\n❌ Configuration incomplète. Vérifiez vos variables d\'environnement.');
    process.exit(1);
  }

  // 2. Tester la génération d'access token
  console.log('\n🔑 Test de génération d\'access token...');
  
  try {
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      process.env.GMAIL_OAUTH_CLIENT_ID,
      process.env.GMAIL_OAUTH_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      });
    });

    console.log('✅ Access token généré avec succès');
    console.log(`🔑 Token: ${accessToken.substring(0, 20)}...`);

    // 3. Tester la création du transporteur
    console.log('\n📧 Test de création du transporteur Nodemailer...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_SENDER_EMAIL,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    // 4. Vérifier la connexion
    console.log('🔌 Test de connexion au serveur Gmail...');
    
    await transporter.verify();
    console.log('✅ Connexion Gmail établie avec succès!');

    // 5. Test d'envoi (optionnel)
    const testEmail = process.env.TEST_EMAIL || process.env.GMAIL_SENDER_EMAIL;
    
    if (process.argv.includes('--send-test')) {
      console.log(`\n📮 Envoi d'un email de test à ${testEmail}...`);
      
      const mailOptions = {
        from: process.env.GMAIL_SENDER_EMAIL,
        to: testEmail,
        subject: '✅ Test Gmail OAuth2 - Trouve Ton Nkama',
        html: `
          <h2>🎉 Configuration Gmail OAuth2 réussie!</h2>
          <p>Votre configuration Gmail OAuth2 fonctionne parfaitement.</p>
          <p><strong>Email envoyé depuis:</strong> ${process.env.GMAIL_SENDER_EMAIL}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p><small>Trouve Ton Nkama - Système d'emails</small></p>
        `,
        text: `
          Configuration Gmail OAuth2 réussie!
          
          Votre configuration Gmail OAuth2 fonctionne parfaitement.
          Email envoyé depuis: ${process.env.GMAIL_SENDER_EMAIL}
          Timestamp: ${new Date().toLocaleString()}
          
          Trouve Ton Nkama - Système d'emails
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email de test envoyé avec succès!');
    }

    console.log('\n🎉 Configuration Gmail OAuth2 entièrement fonctionnelle!');
    console.log('\nℹ️  Pour envoyer un email de test, utilisez:');
    console.log('   node scripts/test-gmail-config.js --send-test');

  } catch (error) {
    console.error('\n❌ Erreur de configuration:', error.message);
    
    // Messages d'erreur spécifiques
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Solutions possibles:');
      console.log('   1. Régénérez le refresh token via OAuth2 Playground');
      console.log('   2. Vérifiez que l\'API Gmail est activée');
      console.log('   3. Vérifiez que les credentials OAuth2 sont corrects');
    } else if (error.message.includes('insufficient_scope')) {
      console.log('\n💡 Solution:');
      console.log('   Ajoutez le scope https://www.googleapis.com/auth/gmail.send');
    } else if (error.message.includes('API not enabled')) {
      console.log('\n💡 Solution:');
      console.log('   Activez l\'API Gmail dans Google Cloud Console');
    }
    
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testGmailConfig().catch(console.error);
} 