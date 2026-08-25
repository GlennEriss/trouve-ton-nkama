/**
 * Bascule d'envoi des emails d'auth (vérification + reset mot de passe), CÔTÉ CLIENT
 * (2026-08-25). 'custom' (défaut) passe par notre pipeline (Hostinger/Gmail OAuth2, voir
 * src/services/email.service.ts). 'firebase_default' envoie directement via l'infrastructure
 * Firebase (sendEmailVerification/sendPasswordResetEmail du SDK client), pour ne plus dépendre
 * de Hostinger le temps de régler la facture — objectif : remettre 'custom' une fois payée.
 *
 * Distinct de la variable serveur EMAIL_PROVIDER (email.service.ts / Cloud Function), qui ne
 * pilote que le choix Hostinger/Gmail OAuth2 à l'intérieur du pipeline custom.
 */
export function isFirebaseDefaultEmailProvider(): boolean {
  return process.env.NEXT_PUBLIC_EMAIL_PROVIDER === 'firebase_default';
}

export function getAppHost(): string {
  return process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
}
