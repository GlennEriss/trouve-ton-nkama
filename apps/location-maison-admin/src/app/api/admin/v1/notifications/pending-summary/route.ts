import { NextRequest } from "next/server";

import { jsonError, jsonSuccess } from "@/lib/api/response";
import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";
import { hasPermission } from "@/modules/iam/domain/permissions";
import { requireAdmin } from "@/modules/iam/presentation/admin-guard";
import type { AdminPermission } from "@/modules/iam/domain/types";

/**
 * Compteurs des files d'attente qui réclament une décision admin, agrégés en une
 * seule requête pour la cloche de notifications.
 *
 * Un seul endpoint plutôt que 6 appels côté client : la cloche est montée sur
 * toutes les pages de l'admin, 6 requêtes à chaque navigation seraient coûteuses.
 *
 * On utilise l'agrégation `count()` de Firestore : elle ne rapatrie aucun
 * document, seulement le nombre — indispensable ici, ces collections peuvent être
 * volumineuses.
 *
 * Chaque file est filtrée par la permission correspondante : un admin ne voit
 * dans sa cloche que ce qu'il a le droit de traiter.
 */

type QueueDefinition = {
  key: string;
  label: string;
  href: string;
  /** Permission requise ; la file est omise si l'admin ne l'a pas. */
  permissions: AdminPermission[];
  collection: string;
  filters: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>;
};

const QUEUES: QueueDefinition[] = [
  {
    key: "listings",
    label: "Annonces à modérer",
    href: "/dashboard/moderation",
    permissions: ["listings.approve", "listings.state.update"],
    collection: COLLECTIONS.properties,
    filters: [["moderationStatus", "==", "PENDING"]],
  },
  {
    key: "reels",
    label: "Réels à modérer",
    href: "/dashboard/reels-moderation",
    permissions: ["listings.approve", "listings.state.update"],
    collection: COLLECTIONS.reels,
    // Même condition que la file de modération des réels : un réel encore en
    // cours de traitement vidéo n'est pas actionnable.
    filters: [
      ["moderationStatus", "==", "PENDING"],
      ["processingStatus", "==", "ready"],
    ],
  },
  {
    key: "search_requests",
    label: "Demandes de recherche",
    href: "/dashboard/search-requests-moderation",
    permissions: ["search_requests.read"],
    collection: COLLECTIONS.search_requests,
    filters: [["moderationStatus", "==", "PENDING"]],
  },
  {
    key: "gift_withdrawals",
    label: "Retraits cadeaux",
    href: "/dashboard/gift-withdrawals",
    permissions: ["gift_withdrawals.read"],
    collection: COLLECTIONS.gift_withdrawals,
    filters: [["statut", "==", "EN_ATTENTE"]],
  },
  {
    key: "listing_claims",
    label: "Revendications d'annonces",
    href: "/dashboard/listing-claims",
    permissions: ["listings.read"],
    collection: COLLECTIONS.listing_claim_reviews,
    filters: [["status", "==", "pending"]],
  },
  {
    key: "ad_campaigns",
    label: "Campagnes publicitaires",
    href: "/dashboard/advertising",
    permissions: ["ads_campaigns.read"],
    collection: COLLECTIONS.ad_campaigns,
    filters: [["status", "==", "pending_review"]],
  },
];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return auth.response;
  }

  const allowed = QUEUES.filter((queue) =>
    queue.permissions.some((permission) => hasPermission(auth.admin.permissions, permission)),
  );

  try {
    const db = getFirebaseAdminDb();

    const results = await Promise.all(
      allowed.map(async (queue) => {
        let query: FirebaseFirestore.Query = db.collection(queue.collection);
        for (const [field, op, value] of queue.filters) {
          query = query.where(field, op, value);
        }

        try {
          const snapshot = await query.count().get();
          return { key: queue.key, label: queue.label, href: queue.href, count: snapshot.data().count };
        } catch {
          // Une file en erreur (index manquant, collection absente) ne doit pas
          // faire tomber toute la cloche : on la remonte à null et l'UI l'ignore.
          return { key: queue.key, label: queue.label, href: queue.href, count: null };
        }
      }),
    );

    const total = results.reduce((sum, entry) => sum + (entry.count ?? 0), 0);

    return jsonSuccess({ queues: results, total }, auth.correlationId);
  } catch (error) {
    return jsonError(
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Impossible de charger les notifications.",
      },
      500,
      auth.correlationId,
    );
  }
}
