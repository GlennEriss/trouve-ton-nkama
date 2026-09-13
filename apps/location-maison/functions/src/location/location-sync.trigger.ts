import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions/v1';
import { adminDB } from '../admin';
import { extractLocationFields, shouldSyncLocation } from './location-sync.policy';
import { syncPropertyLocation } from './location-sync.service';

/**
 * Logique du handler, séparée de l'enregistrement `.onWrite` ci-dessous pour rester
 * directement testable — `firebase-functions/v1` reconstruit ses propres
 * `DocumentSnapshot` à partir du format "wire" quand on appelle le `CloudFunction` exporté,
 * ce qui rend un appel direct avec de simples objets `{exists, data}` impossible en test
 * unitaire sans émulateur ni `firebase-functions-test`.
 */
export async function handleLocationSyncEvent(
  propertyId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Promise<void> {
  if (!shouldSyncLocation(before, after)) {
    return;
  }

  const location = extractLocationFields(after);
  if (!location) {
    // Ne devrait pas arriver : shouldSyncLocation() l'aurait déjà exclu. Filet de sécurité.
    return;
  }

  try {
    const result = await syncPropertyLocation(adminDB, location);
    functions.logger.debug('Location sync completed', { propertyId, ...result });
  } catch (error) {
    functions.logger.error('Location sync failed', {
      propertyId,
      province: location.province,
      city: location.city,
      street: location.street || null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Sort la synchronisation des collections géographiques secondaires (`provinces`, `cities`,
 * `streets`) du chemin critique de publication d'une annonce immobilière — voir
 * docs/performance-creation-modification-annonces-reels.md, point 1.
 *
 * `.onWrite` (pas seulement `.onCreate`) : une annonce immobilière peut changer de ville, de
 * province ou de rue pendant son édition. Une suppression est ignorée par
 * `shouldSyncLocation`. Portée strictement limitée à la hiérarchie scalaire historique —
 * les annonces à zones multiples (Mode, `zones`/`cities`) sont explicitement exclues, voir
 * `extractLocationFields`.
 *
 * Résultat de la publication principale jamais affecté : les erreurs sont journalisées puis
 * avalées (pas de rejet), le retry automatique n'étant pas encore activé pour ce premier lot
 * (voir "Décisions proposées" du point 1) — aucun statut d'erreur n'est écrit dans
 * `properties`, ce qui redéclencherait ce même trigger.
 */
export const onPropertyLocationSync = functions.firestore
  .document('properties/{propertyId}')
  .onWrite(async (change, context) => {
    const propertyId = context.params.propertyId as string;
    const before = change.before.exists ? (change.before.data() as Record<string, unknown>) : undefined;
    const after = change.after.exists ? (change.after.data() as Record<string, unknown>) : undefined;

    await handleLocationSyncEvent(propertyId, before, after);
    return null;
  });
