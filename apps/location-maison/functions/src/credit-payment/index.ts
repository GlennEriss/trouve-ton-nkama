import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import twilio from 'twilio';

interface CreditPaymentRequest {
  phoneNumber: string;
  amount: number;
  token: string;
}

interface CreditPaymentResponse {
  success: boolean;
  message: string;
  code?: string;
}

// Initialisation du client Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Configuration de l'entreprise
const COMPANY_NAME = 'Logis Gabon';
const WEBSITE_URL = process.env.WEBSITE_URL;

export const createCreditPayment = onRequest(async (req, res) => {
  // Vérifier que c'est une requête POST
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Méthode non autorisée' });
    return;
  }

  try {
    const { phoneNumber, amount, token } = req.body as CreditPaymentRequest;

    // Vérifier le token
    const validToken = process.env.API_TOKEN;
    if (token !== validToken) {
      res.status(401).json({ success: false, message: 'Token invalide' });
      return;
    }

    // Valider le numéro de téléphone gabonais (format: +241XXXXXXXX)
    const phoneRegex = /^\+241[0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      res.status(400).json({ success: false, message: 'Numéro de téléphone invalide' });
      return;
    }

    // Valider le montant
    if (amount <= 0) {
      res.status(400).json({ success: false, message: 'Montant invalide' });
      return;
    }

    // Calculer le nombre de crédits (1 crédit = 400 FCFA)
    const credits = Math.floor(amount / 400);

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Stocker dans Firestore
    const paymentRef = admin.firestore().collection('credit_payments').doc();
    await paymentRef.set({
      phoneNumber,
      amount,
      credits,
      code,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usedBy: null, // Sera mis à jour quand un utilisateur utilisera le code
      usedAt: null, // Sera mis à jour quand le code sera utilisé
    });

    // Envoyer le code par SMS via Twilio
    try {
      const message = `${COMPANY_NAME} - Achat de crédit réussi!\n\n` +
        `Votre code de paiement est: ${code}\n` +
        `Montant: ${amount} FCFA\n` +
        `Crédits: ${credits}\n\n` +
        `Pour utiliser votre code, visitez: ${WEBSITE_URL}`;

      await sendSMS(phoneNumber, message);
    } catch (smsError) {
      console.error('Erreur lors de l\'envoi du SMS:', smsError);
      // On continue même si l'envoi du SMS échoue
    }

    const response: CreditPaymentResponse = {
      success: true,
      message: 'Code de paiement généré avec succès',
      code,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du traitement du paiement' });
  }
});

// Fonction pour envoyer le SMS via Twilio
async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  try {
    // Vérifier la configuration Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Configuration Twilio manquante');
    }

    // Envoyer le SMS via Twilio
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    throw new Error('Échec de l\'envoi du SMS');
  }
}
