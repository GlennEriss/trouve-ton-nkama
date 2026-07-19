import '../node/slow-buffer-compat';
import { onRequest } from 'firebase-functions/v2/https';
import { adminDB } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';
// import twilio from 'twilio'; // Commenté pour l'instant

type ManualCreditPack = {
  id: string;
  name: string;
  credits: number;
  amount: number;
};

type RawCreditPackDoc = {
  name?: unknown;
  credits?: unknown;
  price?: unknown;
  isActive?: unknown;
  order?: unknown;
};

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

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

async function loadActiveCreditPacks(): Promise<ManualCreditPack[]> {
  const snapshot = await adminDB.collection('credit_packs').orderBy('order', 'asc').get();
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as RawCreditPackDoc;
      const isActive = typeof data.isActive === 'boolean' ? data.isActive : true;
      if (!isActive) {
        return null;
      }

      return {
        id: toTrimmedString(doc.id) ?? doc.id,
        name: toTrimmedString(data.name) ?? doc.id,
        credits: Math.max(1, Math.trunc(toFiniteNumber(data.credits, 1))),
        amount: Math.max(0, Math.round(toFiniteNumber(data.price, 0))),
      } satisfies ManualCreditPack;
    })
    .filter((pack): pack is ManualCreditPack => Boolean(pack));
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
    const normalizedAmount = Math.round(Number(amount));
    const creditPacks = await loadActiveCreditPacks();

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
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      res.status(400).json({ success: false, message: 'Montant invalide' });
      return;
    }

    if (creditPacks.length === 0) {
      res.status(503).json({
        success: false,
        message: 'Aucun pack de crédits actif n\'est configuré actuellement.',
      });
      return;
    }

    // Vérifier si le montant est autorisé
    const selectedPack = creditPacks.find(pack => pack.amount === normalizedAmount);
    if (!selectedPack) {
      // Enregistrer dans la collection des montants à rembourser
      await adminDB.collection('refund_payments').add({
        phoneNumber,
        amount: normalizedAmount,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        reason: 'Montant non autorisé',
        refundedAt: null
      });

      // Envoyer un SMS informatif
      const errorMessage = `${COMPANY_NAME} - Montant non autorisé\n\n` +
        `Le montant de ${normalizedAmount} FCFA ne correspond à aucun forfait.\n\n` +
        `Nos forfaits disponibles :\n` +
        creditPacks.map(pack => 
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
      amount: normalizedAmount,
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
      `Montant: ${normalizedAmount} FCFA\n` +
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
