#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier la livraison des emails
 * Usage: node scripts/debug-email-delivery.js [email]
 */

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function debugEmailDelivery() {
  console.log('🔍 DIAGNOSTIC DE LIVRAISON D\'EMAIL\n');
  
  const TARGET_EMAIL = process.argv[2] || 'iamprogrammer221@gmail.com';
  const SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL;
  
  console.log(`📧 Test d'envoi à : ${TARGET_EMAIL}`);
  console.log(`📧 Depuis : ${SENDER_EMAIL}`);
  console.log(`⏰ Heure : ${new Date().toLocaleString()}\n`);
  
  try {
    // 1. Vérifier la configuration
    console.log('🔧 1. Vérification de la configuration...');
    
    const requiredVars = [
      'GMAIL_SENDER_EMAIL',
      'GMAIL_OAUTH_CLIENT_ID', 
      'GMAIL_OAUTH_CLIENT_SECRET',
      'GMAIL_OAUTH_REFRESH_TOKEN'
    ];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        console.log(`❌ ${varName} manquant`);
        return;
      } else {
        console.log(`✅ ${varName} configuré`);
      }
    }
    
    // 2. Générer access token
    console.log('\n🔑 2. Génération de l\'access token...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_OAUTH_CLIENT_ID,
      process.env.GMAIL_OAUTH_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();
    console.log('✅ Access token généré');
    console.log(`🔑 Token (tronqué) : ${accessToken.token.substring(0, 20)}...`);

    // 3. Créer le transporteur avec debug
    console.log('\n📮 3. Création du transporteur avec debug...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: SENDER_EMAIL,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
      debug: true, // Active les logs détaillés
      logger: true  // Active le logger
    });

    // 4. Vérifier la connexion
    console.log('\n🔌 4. Test de connexion au serveur Gmail...');
    await transporter.verify();
    console.log('✅ Connexion Gmail établie');

    // 5. Préparer un email simple de test
    console.log('\n📝 5. Préparation de l\'email de test...');
    
    const testId = Date.now();
    const emailOptions = {
      from: `"🔍 Debug Test" <${SENDER_EMAIL}>`,
      to: TARGET_EMAIL,
      subject: `🧪 Test Debug Email - ${testId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #2563eb;">🔍 Email de Debug - Test de Livraison</h2>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">✅ Email reçu avec succès !</h3>
            <p><strong>ID du test :</strong> ${testId}</p>
            <p><strong>Heure d'envoi :</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Expéditeur :</strong> ${SENDER_EMAIL}</p>
            <p><strong>Destinataire :</strong> ${TARGET_EMAIL}</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #d97706;">🎯 Actions à vérifier :</h4>
            <ul>
              <li>✅ Cet email est arrivé dans la boîte de réception</li>
              <li>📁 Vérifier le dossier <strong>Spam/Courrier indésirable</strong></li>
              <li>⚙️ Ajouter ${SENDER_EMAIL} aux contacts</li>
              <li>📱 Vérifier sur mobile et web</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            Email de test automatisé envoyé depuis Trouve Ton Nkama<br>
            Ne pas répondre à cet email.
          </p>
        </div>
      `,
      text: `
🔍 Email de Debug - Test de Livraison

✅ Email reçu avec succès !

ID du test : ${testId}
Heure d'envoi : ${new Date().toLocaleString()}
Expéditeur : ${SENDER_EMAIL}
Destinataire : ${TARGET_EMAIL}

🎯 Actions à vérifier :
- ✅ Cet email est arrivé dans la boîte de réception
- 📁 Vérifier le dossier Spam/Courrier indésirable
- ⚙️ Ajouter ${SENDER_EMAIL} aux contacts
- 📱 Vérifier sur mobile et web

Email de test automatisé envoyé depuis Trouve Ton Nkama
Ne pas répondre à cet email.
      `
    };

    // 6. Envoyer l'email avec logs détaillés
    console.log('\n📤 6. Envoi de l\'email avec logs détaillés...');
    
    const info = await transporter.sendMail(emailOptions);
    
    console.log('\n✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log('═'.repeat(50));
    console.log(`📧 ID du message : ${info.messageId}`);
    console.log(`📬 Destinataire : ${TARGET_EMAIL}`);
    console.log(`📨 Réponse serveur : ${info.response}`);
    console.log(`🆔 Test ID : ${testId}`);
    console.log('═'.repeat(50));
    
    console.log('\n🔍 VÉRIFICATIONS À FAIRE :');
    console.log('1. Vérifiez votre boîte de réception principale');
    console.log('2. 📁 Vérifiez le dossier SPAM/Courrier indésirable');
    console.log('3. 📱 Vérifiez sur mobile ET sur web');
    console.log('4. ⚙️ Ajoutez ' + SENDER_EMAIL + ' à vos contacts');
    console.log('5. ⏰ Attendez 2-3 minutes max');
    
    console.log('\n💡 Si l\'email n\'arrive toujours pas :');
    console.log('- Le fournisseur de messagerie bloque peut-être l\'email');
    console.log('- Essayez avec une autre adresse email');
    console.log('- Vérifiez les paramètres de sécurité Gmail');
    
  } catch (error) {
    console.log('\n❌ ERREUR LORS DE L\'ENVOI :');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Solution : Régénérez le refresh token via OAuth2 Playground');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Solution : Vérifiez vos credentials OAuth2');
    }
  }
}

debugEmailDelivery(); 