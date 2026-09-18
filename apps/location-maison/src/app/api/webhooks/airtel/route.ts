/**
 * Webhook Airtel Money — DÉSACTIVÉ.
 *
 * Faille de sécurité active en prod, corrigée en désactivant entièrement la route plutôt qu'en
 * la sécurisant : `verifyWebhookSignature` ne vérifiait jamais rien (retournait toujours `true`,
 * aucune route non authentifiée), et `addCreditsToUser` créditait le compte à chaque appel sans
 * aucune garde d'idempotence — un attaquant en possession d'un id de `credit_transactions`
 * (visible dans sa propre page d'historique pour toute transaction déjà existante, y compris un
 * crédit manuel admin) pouvait rejouer ce webhook indéfiniment pour se créditer en boucle, sans
 * payer.
 *
 * Confirmé sans usage légitime possible : le paiement Airtel n'est initié nulle part dans l'app
 * — `functions/src/index.ts` n'exporte que `initiatePurchase` de `./payments/mypayga`, jamais
 * celui de `./payments/airtel` (fichier mort, jamais déployé comme Cloud Function). Sans
 * initiation possible, aucun paiement Airtel réel ne peut jamais déclencher légitimement ce
 * webhook — c'était donc de la surface d'attaque pure, sans fonction. Le vrai flux de recharge
 * en production est MyPayGa (`functions/src/payments/mypayga/webhook.ts`, lui correctement
 * sécurisé : signature HMAC réelle + garde d'idempotence `entitlementApplyState`).
 */

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.webhooks.airtel');

export async function POST(): Promise<NextResponse> {
  logger.warn('Airtel webhook called but this route is decommissioned — refusing');
  return NextResponse.json({ error: 'Ce webhook est désactivé.' }, { status: 410 });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Ce webhook est désactivé.' }, { status: 410 });
}
