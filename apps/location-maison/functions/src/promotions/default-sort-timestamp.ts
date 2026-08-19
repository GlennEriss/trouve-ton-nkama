import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions/v1';
import { admin } from '../admin';

/**
 * Initialise `sortTimestamp` = `createdAt` sur toute nouvelle annonce.
 *
 * Fait au niveau d'un trigger plutôt que dans chaque point de création (client
 * property.db.ts, import Apify admin, provisioning de compte annonceur...) pour qu'aucune
 * annonce ne puisse se retrouver sans ce champ — /search (customRanking Algolia) en dépend
 * pour le tri par défaut, et une annonce qui en serait dépourvue se classerait tout en bas,
 * sous toutes les autres.
 */
export const onPropertyCreateDefaultSortTimestamp = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snapshot) => {
    const data = snapshot.data();
    if (data.sortTimestamp) {
      return; // Déjà renseigné par l'appelant (ne devrait pas arriver aujourd'hui, mais inoffensif).
    }

    await snapshot.ref.update({
      sortTimestamp: data.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
    });
  });
