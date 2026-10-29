import { CallbackPayload, computeCallbackHash, timingSafeEqual } from '../mypayga/callback-shared';

export const QUICK_AMOUNT_XAF = 200;
export function verifiedQuickOutcome(payload: CallbackPayload, secret: string): 'confirmed' | 'failed' | null {
  if (!secret || !/^[a-f0-9]{64}$/.test(payload.uniqueId) || !payload.amount.trim() || Number(payload.amount) !== QUICK_AMOUNT_XAF ||
      !timingSafeEqual(computeCallbackHash(payload, secret), payload.hash)) throw new Error('INVALID_CALLBACK');
  // Only orderStatus is signed. statusRequest and loose message substring matches cannot authorize money.
  const status = payload.orderStatus.toLowerCase();
  if (['200', 'success', 'successful', 'paid', 'confirmed', 'complete', 'completed'].includes(status)) return 'confirmed';
  if (['failed', 'failure', 'rejected', 'cancelled', 'canceled', '400', '401', '402', '403'].includes(status)) return 'failed';
  return null;
}
