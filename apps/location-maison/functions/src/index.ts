/**
 * Firebase Cloud Functions
 * 
 * Ce fichier exporte toutes les fonctions Cloud de l'application.
 * Les fonctions sont organisées par catégorie (notifications, paiements, etc.)
 */

// Compat Node recent pour des dependances legacy chargees par firebase-admin/jsonwebtoken.
import './node/slow-buffer-compat';

// ⚠️ IMPORTANT : Charger les variables d'environnement avant les exports applicatifs.
// Cette importation charge automatiquement le .env lors de l'import du module
import './config/env';

// Fonctions de notification
export {
  onUserCreate,
  onUserFavorisUpdate,
  onPropertyCreateNewAnnouncement,
  onPropertyFavorisUpdate,
  onPropertyFavorisDelete,
  onPropertyModerationStatusChange,
} from './notification';

// Fonctions de paiement
export { initiatePurchase, mypaygaPaymentCallback } from './payments/mypayga';
export { initiateGiftPayment, giftPaymentCallback } from './payments/gifts';
export { createCreditPayment } from './credit-payment';

// Fonctions d'email
export { sendVerificationEmail } from './email/verification';

// Fonctions analytics (scheduler)
export { syncAdSenseToAdminAnalytics } from './analytics/adsense-sync';

// Fonctions Réels (transcodage vidéo)
export { transcodeReelVideo } from './reels';

// Exemple de fonction (à décommenter si nécessaire)
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
