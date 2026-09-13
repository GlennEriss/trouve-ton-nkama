import * as functions from 'firebase-functions/v1';
import { buildOwnerUids, hasExpectedOwnerUids } from './owner-uids-policy';

/**
 * Filet de sécurité pour les imports et scripts qui écrivent directement dans Firestore.
 * La comparaison rend la fonction idempotente : sa propre mise à jour provoque un second
 * événement qui sort immédiatement, sans boucle d'écriture.
 */
export const onPropertyOwnerUidsSync = functions.firestore
  .document('properties/{propertyId}')
  .onWrite(async (change) => {
    if (!change.after.exists) return;

    const data = change.after.data() ?? {};
    const expected = buildOwnerUids(data);
    if (hasExpectedOwnerUids(data.ownerUids, expected)) return;

    await change.after.ref.update({ ownerUids: expected });
  });
