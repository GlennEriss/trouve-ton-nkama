/**
 * Firebase Cloud Functions
 * 
 * Ce fichier exporte toutes les fonctions Cloud de l'application.
 * Les fonctions sont organisées par catégorie (notifications, paiements, etc.)
 */

//import { onRequest } from "firebase-functions/v2/https";
//import * as logger from "firebase-functions/logger";

// Fonctions de notification
export { onUserCreate, onUserFavorisUpdate } from './notification';

// Fonctions de paiement
export { initiatePurchase } from './payments/airtel';
export { createCreditPayment } from './credit-payment';

// Exemple de fonction (à décommenter si nécessaire)
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
