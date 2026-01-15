import { onRequest } from 'firebase-functions/v2/https';
import { adminDB } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';
// import twilio from 'twilio'; // Commenté pour l'instant

// Montants autorisés pour les packs de crédits
const CREDIT_PACKS = [
  {
    amount: 2000,
    name: 'Starter',
    credits: 5
  },
  {
    amount: 3500,
    name: 'Standard',
    credits: 10
  },
  {
    amount: 7500,
    name: 'Avancé',
    credits: 25
  },
  {
    amount: 12500,
    name: 'Premium',
    credits: 50
  }
];

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

// Initialisation du client Twilio (commenté pour l'instant)
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// Configuration de l'entreprise
const COMPANY_NAME = 'Trouve Ton Nkama';
const WEBSITE_URL = process.env.WEBSITE_URL;

// Fonction pour envoyer le SMS via Twilio
async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  try {
    // Vérifier la configuration Twilio
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error('Configuration Twilio manquante');
    }

    console.log('Envoi du SMS à', phoneNumber);
    console.log('Message:', message);

    // Envoyer le SMS via Twilio
    /* const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    }); */

    //console.log('SMS envoyé avec succès:', result.sid);
    console.log('SMS envoyé avec succès:');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);
    throw new Error('Échec de l\'envoi du SMS');
  }
}

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

    // Valider le numéro de téléphone sénégalais (format: +221XXXXXXXXX)
    const phoneRegex = /^\+221\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      res.status(400).json({ success: false, message: 'Numéro de téléphone sénégalais invalide' });
      return;
    }

    // Valider le montant
    if (amount <= 0) {
      res.status(400).json({ success: false, message: 'Montant invalide' });
      return;
    }

    // Vérifier si le montant est autorisé
    const selectedPack = CREDIT_PACKS.find(pack => pack.amount === amount);
    if (!selectedPack) {
      // Enregistrer dans la collection des montants à rembourser
      await adminDB.collection('refund_payments').add({
        phoneNumber,
        amount,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        reason: 'Montant non autorisé',
        refundedAt: null
      });

      // Envoyer un SMS informatif
      const errorMessage = `${COMPANY_NAME} - Montant non autorisé\n\n` +
        `Le montant de ${amount} FCFA ne correspond à aucun forfait.\n\n` +
        `Nos forfaits disponibles :\n` +
        CREDIT_PACKS.map(pack => 
          `- Pack ${pack.name} : ${pack.amount.toLocaleString()} FCFA (${pack.credits} crédits)`
        ).join('\n') + '\n\n' +
        `Pour toute réclamation, contactez notre service client :\n` +
        `📞 ${process.env.CUSTOMER_SERVICE_PHONE ?? '+241 XX XX XX XX'}\n` +
        `🌐 ${WEBSITE_URL}/contact`;

      await sendSMS(phoneNumber, errorMessage);

      res.status(400).json({ 
        success: false, 
        message: 'Montant non autorisé. Veuillez consulter les forfaits disponibles sur notre site ou contacter notre service client.' 
      });
      return;
    }


    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Stocker dans Firestore
    const paymentRef = adminDB.collection('credit_payments').doc();
    await paymentRef.set({
      phoneNumber,
      amount,
      credits: selectedPack.credits,
      name: selectedPack.name,
      code,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      usedBy: null, // Sera mis à jour quand un utilisateur utilisera le code
      usedAt: null, // Sera mis à jour quand le code sera utilisé
    });

    // Envoyer le code par SMS via Twilio
    const successMessage = `${COMPANY_NAME} - Achat de crédit réussi!\n\n` +
      `Votre code de paiement est: ${code}\n` +
      `Pack: ${selectedPack.name}\n` +
      `Montant: ${amount} FCFA\n` +
      `Crédits: ${selectedPack.credits}\n\n` +
      `Pour utiliser votre code, visitez: ${WEBSITE_URL}`;

    await sendSMS(phoneNumber, successMessage);

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
