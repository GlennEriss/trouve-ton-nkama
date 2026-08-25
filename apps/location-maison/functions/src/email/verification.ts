import * as functions from 'firebase-functions/v1';
import { adminAuth } from '../admin';
import * as nodemailer from 'nodemailer';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

interface SendVerificationEmailRequest {
  email?: string;
  uid?: string;
  subject?: string;
  texts?: any;
}

/**
 * Cloud Function HTTP pour envoyer un email de vérification
 * 
 * Usage:
 * POST https://us-central1-location-maison-dev.cloudfunctions.net/sendVerificationEmail
 * Body: { "uid": "user-uid" } ou { "email": "user@example.com" }
 */
export const sendVerificationEmail = functions
  .runWith({
    secrets: [
      'HOSTINGER_EMAIL_USER',
      'HOSTINGER_EMAIL_PASS',
      'EMAIL_DISPLAY_NAME',
      'NEXT_PUBLIC_APP_URL',
    ],
  })
  .https.onRequest(async (request, response) => {
  // CORS headers
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body: SendVerificationEmailRequest = request.body;
    const { email, uid, subject, texts } = body;

    if (!email && !uid) {
      response.status(400).json({
        error: 'Email ou UID est requis',
      });
      return;
    }

    try {
      // Récupérer l'utilisateur par son email ou UID
      const user = uid
        ? await adminAuth.getUser(uid)
        : await adminAuth.getUserByEmail(email!);

      if (user.emailVerified) {
        response.status(200).json({
          success: false,
          message: 'Email déjà vérifié',
          alreadyVerified: true,
        });
        return;
      }

      // Charger les secrets depuis Secret Manager (une seule fois)
      console.log('🔄 Chargement des secrets...');
      const secrets = await loadSecrets();
      console.log('✅ Secrets chargés:', {
        hasEmailUser: !!secrets.HOSTINGER_EMAIL_USER,
        hasEmailPass: !!secrets.HOSTINGER_EMAIL_PASS,
        hasDisplayName: !!secrets.EMAIL_DISPLAY_NAME,
        hasAppUrl: !!secrets.NEXT_PUBLIC_APP_URL,
      });
      const appUrl = secrets.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Générer le lien de vérification
      const verificationLink = generateEmailVerificationLink(user.uid, appUrl);

      // Préparer les données pour l'email
      const userEmail = user.email || email || '';
      const name = user.displayName?.split(' ')[0] || (userEmail ? userEmail.split('@')[0] : 'Utilisateur');

      // Textes par défaut
      const defaultTexts = {
        greeting: 'Bonjour',
        instruction: '🎉 Félicitations ! Votre compte Trouve Ton Nkama a été créé avec succès ! Pour publier vos annonces immobilières sur notre plateforme, vous devez d\'abord vérifier votre adresse email.',
        buttonText: 'Vérifier mon email et activer mon compte',
        additionalInfo: 'Une fois votre email vérifié, vous pourrez publier et gérer vos annonces immobilières en toute sécurité.',
        expirationInfo: '⚠️ IMPORTANT : Ce lien de vérification expire dans exactement 24 heures à compter de maintenant pour votre sécurité. Pensez à cliquer dessus rapidement !',
        copyRight: `© ${new Date().getFullYear()} Trouve Ton Nkama. Tous droits réservés.`,
        supportEmail: 'support@tonnkama.com',
        websiteUrl: 'https://tonnkama.com',
      };

      const emailTexts = texts || defaultTexts;

      // Générer l'email HTML
      const emailHtml = generateVerificationEmailHTML(name, userEmail, verificationLink, emailTexts);

      // Générer l'email en texte brut
      const emailText = generateVerificationEmailText(name, userEmail, verificationLink, emailTexts);

      // Utiliser les secrets chargés
      const emailUser = secrets.HOSTINGER_EMAIL_USER;
      const emailPass = secrets.HOSTINGER_EMAIL_PASS;
      const displayName = secrets.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama';

      console.log('Configuration email:', {
        hasEmailUser: !!emailUser,
        hasEmailPass: !!emailPass,
        emailUser: emailUser ? `${emailUser.substring(0, 3)}***` : 'N/A',
        displayName,
      });

      if (!emailUser || !emailPass) {
        console.error('Configuration email manquante:', {
          hasEmailUser: !!emailUser,
          hasEmailPass: !!emailPass,
        });
        throw new Error('Configuration email manquante: HOSTINGER_EMAIL_USER et HOSTINGER_EMAIL_PASS sont requis');
      }

      console.log('Création du transporteur SMTP...');
      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      // Vérifier la connexion SMTP
      console.log('Vérification de la connexion SMTP...');
      try {
        await transporter.verify();
        console.log('✅ Connexion SMTP vérifiée avec succès');
      } catch (verifyError: any) {
        console.error('❌ Erreur de vérification SMTP:', verifyError);
        throw new Error(`Échec de la vérification SMTP: ${verifyError.message}`);
      }

      // Données de l'email
      const emailData = {
        from: `"${displayName}" <${emailUser}>`,
        to: userEmail,
        subject: subject || 'Vérifiez votre adresse email - Trouve Ton Nkama',
        text: emailText,
        html: emailHtml,
      };

      console.log('Envoi de l\'email à:', userEmail);
      // Envoyer l'email
      const sendResult = await transporter.sendMail(emailData);
      console.log('✅ Email envoyé avec succès:', {
        messageId: sendResult.messageId,
        accepted: sendResult.accepted,
        rejected: sendResult.rejected,
      });

      response.status(200).json({
        success: true,
        message: 'Email de vérification envoyé avec succès',
        ...(process.env.FUNCTIONS_EMULATOR && { verificationLink }),
      });
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error.code === 'auth/user-not-found') {
        response.status(404).json({
          error: 'Aucun compte associé à cette adresse email',
        });
        return;
      }

      // Inclure plus de détails dans la réponse pour le debugging
      const errorMessage = error.message || 'Erreur inconnue';
      const errorCode = error.code || 'UNKNOWN_ERROR';
      
      // Toujours logger les détails complets
      console.error('Erreur complète:', JSON.stringify({
        message: errorMessage,
        code: errorCode,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5), // Premières lignes du stack
      }, null, 2));
      
      response.status(500).json({
        error: 'Erreur lors de l\'envoi de l\'email de vérification',
        details: errorMessage, // Toujours inclure les détails pour le debugging
        code: errorCode,
      });
    }
  } catch (error) {
    console.error('Erreur générale:', error);
    response.status(500).json({
      error: 'Erreur interne du serveur',
    });
  }
});

/**
 * Charge les secrets depuis Secret Manager
 * Cache les secrets en mémoire pour éviter de multiples appels API
 */
let secretsCache: { [key: string]: string } | null = null;

async function loadSecrets(): Promise<{ [key: string]: string }> {
  // Utiliser le cache si disponible
  if (secretsCache) {
    return secretsCache;
  }

  const secretNames = [
    'HOSTINGER_EMAIL_USER',
    'HOSTINGER_EMAIL_PASS',
    'EMAIL_DISPLAY_NAME',
    'NEXT_PUBLIC_APP_URL',
  ];

  const secrets: { [key: string]: string } = {};

  // Dans Firebase Functions v1 avec functions.secret(), les secrets sont disponibles via process.env
  // Vérifier d'abord process.env (pour les secrets déclarés ou les tests locaux)
  for (const secretName of secretNames) {
    if (process.env[secretName]) {
      secrets[secretName] = process.env[secretName];
      console.log(`✅ Secret ${secretName} chargé depuis process.env`);
    } else {
      console.warn(`⚠️  Secret ${secretName} non trouvé dans process.env`);
    }
  }

  // Si tous les secrets essentiels sont présents, utiliser ceux-là
  if (secrets.HOSTINGER_EMAIL_USER && secrets.HOSTINGER_EMAIL_PASS) {
    console.log('✅ Tous les secrets essentiels sont disponibles');
    secretsCache = secrets;
    return secrets;
  }

  // Fallback: essayer Secret Manager directement (pour compatibilité)
  console.log('⚠️  Certains secrets manquent, tentative de chargement depuis Secret Manager...');
  const projectId = process.env.GCLOUD_PROJECT || 'location-maison-dev';
  const client = new SecretManagerServiceClient();

  try {
    for (const secretName of secretNames) {
      if (!secrets[secretName]) {
        try {
          const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
          const [version] = await client.accessSecretVersion({ name });
          if (version.payload?.data) {
            secrets[secretName] = version.payload.data.toString();
            console.log(`✅ Secret ${secretName} chargé depuis Secret Manager`);
          }
        } catch (error: any) {
          console.warn(`⚠️  Secret ${secretName} non trouvé dans Secret Manager:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des secrets depuis Secret Manager:', error);
  }

  // Vérifier que les secrets essentiels sont présents
  if (!secrets.HOSTINGER_EMAIL_USER || !secrets.HOSTINGER_EMAIL_PASS) {
    throw new Error('Impossible de charger les secrets HOSTINGER_EMAIL_USER et HOSTINGER_EMAIL_PASS');
  }

  // Mettre en cache
  secretsCache = secrets;
  return secrets;
}

/**
 * Génère le lien de vérification d'email
 */
function generateEmailVerificationLink(uid: string, appUrl: string): string {
  const params = new URLSearchParams();
  params.set('uid', uid);
  // Ajouter un timestamp d'expiration (24 heures = 24 * 60 * 60 * 1000 ms)
  const expirationTime = Date.now() + (24 * 60 * 60 * 1000);
  params.set('expires', expirationTime.toString());
  
  return `${appUrl}/api/auth/verify-email?${params.toString()}`;
}

/**
 * Génère l'email HTML de vérification
 */
function generateVerificationEmailHTML(
  name: string,
  email: string,
  verificationLink: string,
  texts: any
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vérifiez votre email - Trouve Ton Nkama</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #146B67 0%, #1FA89B 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Trouve Ton Nkama</h1>
              <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Votre plateforme immobilière de référence au Gabon</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 25px 20px;">
              <p style="font-size: 18px; font-weight: bold; color: #000000; margin: 0 0 12px 0; text-align: center;">
                ${texts.greeting} ${name} 👋
              </p>
              
              <div style="background-color: #ecfdf5; padding: 10px 12px; border-radius: 6px; border: 1px solid #059669; margin: 0 0 15px 0;">
                <p style="font-size: 14px; font-weight: bold; color: #065f46; margin: 0; text-align: center;">
                  🎉 Félicitations ! Votre compte a été créé avec succès !
                </p>
              </div>
              
              <p style="font-size: 13px; color: #1f2937; margin: 0 0 15px 0; text-align: center; line-height: 1.5;">
                ${texts.instruction}
              </p>
              
              <!-- Button -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${verificationLink}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 3px 6px rgba(22, 163, 74, 0.2); border: 1px solid #15803d;">
                  ✅ ${texts.buttonText}
                </a>
              </div>
              
              <!-- Expiration Alert -->
              <div style="background-color: #dc2626; padding: 12px; border-radius: 6px; margin: 15px 0; border: 1px solid #b91c1c; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);">
                <p style="font-size: 13px; font-weight: 700; color: #ffffff; margin: 0; text-align: center; line-height: 1.4;">
                  ${texts.expirationInfo}
                </p>
              </div>
              
              <!-- Additional Info -->
              <div style="background-color: #f8fafc; padding: 12px; border-radius: 5px; border: 1px solid #e2e8f0; margin: 15px 0;">
                <p style="font-size: 12px; color: #374151; margin: 0; text-align: center; line-height: 1.5;">
                  ${texts.additionalInfo}
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #d1d5db; margin: 20px 0;">
              
              <!-- Fallback Link -->
              <p style="font-size: 12px; color: #374151; margin: 0 0 6px 0; text-align: center;">
                🔗 Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="font-size: 11px; color: #1f2937; margin: 0 0 15px 0; word-break: break-all; background-color: #f8f9fa; padding: 8px 12px; border-radius: 5px; border: 1px solid #6b7280; font-family: monospace; text-align: center;">
                ${verificationLink}
              </p>
              
              <!-- Support -->
              <div style="background-color: #f8fafc; padding: 12px; border-radius: 5px; border: 1px solid #e9ecef; margin-top: 15px;">
                <p style="font-size: 12px; color: #374151; margin: 0; text-align: center; line-height: 1.5;">
                  💬 Vous avez des questions ? Contactez notre équipe support à 
                  <a href="mailto:${texts.supportEmail}" style="color: #1f2937; text-decoration: underline; font-weight: 600;">
                    ${texts.supportEmail}
                  </a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 25px 15px; border-top: 3px solid #146B67; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="font-size: 12px; color: #6C757D; margin: 0 0 6px 0;">
                <a href="${texts.websiteUrl}" style="color: #146B67; text-decoration: none; font-weight: 500;">
                  🌐 Visitez notre site web
                </a>
              </p>
              <p style="font-size: 11px; color: #6C757D; margin: 15px 0 0 0; font-style: italic;">
                ${texts.copyRight}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Génère l'email texte brut de vérification
 */
function generateVerificationEmailText(
  name: string,
  email: string,
  verificationLink: string,
  texts: any
): string {
  return `
${texts.greeting} ${name} 👋

🎉 Félicitations ! Votre compte Trouve Ton Nkama a été créé avec succès !

${texts.instruction}

${texts.buttonText}:
${verificationLink}

${texts.expirationInfo}

${texts.additionalInfo}

Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
${verificationLink}

💬 Vous avez des questions ? Contactez notre équipe support à ${texts.supportEmail}

🌐 Visitez notre site web : ${texts.websiteUrl}

${texts.copyRight}
  `.trim();
}
