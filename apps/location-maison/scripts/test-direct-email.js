#!/usr/bin/env node

/**
 * Script pour tester l'envoi direct d'email via le service Gmail
 * Usage: node scripts/test-direct-email.js [email]
 */

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function sendDirectTestEmail() {
  console.log('📧 Test d\'envoi direct via le service Gmail OAuth2\n');
  
  // Utiliser l'email passé en paramètre ou l'email par défaut
  const TARGET_EMAIL = process.argv[2] || 'tootylibro@gmail.com';
  
  console.log(`📧 Envoi à : ${TARGET_EMAIL}`);
  console.log(`📧 Depuis : ${process.env.GMAIL_SENDER_EMAIL}\n`);
  
  try {
    // 1. Générer un access token
    console.log('🔑 Génération de l\'access token...');
    
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

    // 2. Créer le transporteur
    console.log('📮 Création du transporteur...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_SENDER_EMAIL,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    // 3. Préparer l'email
    const emailOptions = {
      from: `"Trouve Ton Nkama 🏠" <${process.env.GMAIL_SENDER_EMAIL}>`,
      to: TARGET_EMAIL,
      subject: '🧪 Test Direct - Email depuis Trouve Ton Nkama',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🏠 Trouve Ton Nkama</h1>
            <p style="color: #6b7280; margin: 5px 0;">Test d'envoi d'email</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">✅ Test d'envoi réussi !</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Félicitations ! Le système d'envoi d'emails de <strong>Trouve Ton Nkama</strong> 
              fonctionne parfaitement avec Gmail OAuth2.
            </p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <h3 style="color: #059669; margin-top: 0; font-size: 16px;">🔧 Configuration testée :</h3>
              <ul style="color: #6b7280; margin: 0;">
                <li>✅ Gmail OAuth2 authentification</li>
                <li>✅ Nodemailer transport</li>
                <li>✅ Templates HTML</li>
                <li>✅ Envoi en production</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://tonnkama.com" 
               style="background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              🏠 Visiter Trouve Ton Nkama
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              Ceci est un email de test automatisé.<br>
              <strong>Trouve Ton Nkama</strong> - Plateforme de location immobilière
            </p>
          </div>
        </div>
      `,
      text: `
🏠 Trouve Ton Nkama - Test d'envoi d'email

✅ Test d'envoi réussi !

Félicitations ! Le système d'envoi d'emails de Trouve Ton Nkama fonctionne parfaitement avec Gmail OAuth2.

🔧 Configuration testée :
- ✅ Gmail OAuth2 authentification
- ✅ Nodemailer transport  
- ✅ Templates HTML
- ✅ Envoi en production

Visiter : https://tonnkama.com

---
Ceci est un email de test automatisé.
Trouve Ton Nkama - Plateforme de location immobilière
      `
    };

    // 4. Envoyer l'email
    console.log('📤 Envoi de l\'email...');
    
    const info = await transporter.sendMail(emailOptions);
    
    console.log('✅ Email envoyé avec succès !');
    console.log(`📧 ID du message : ${info.messageId}`);
    console.log(`📬 Destinataire : ${TARGET_EMAIL}`);
    console.log('\n🎉 Le système d\'envoi d\'emails fonctionne parfaitement !');
    
  } catch (error) {
    console.log('\n❌ Erreur lors de l\'envoi :');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Solution : Régénérez le refresh token via OAuth2 Playground');
    }
  }
}

sendDirectTestEmail(); 