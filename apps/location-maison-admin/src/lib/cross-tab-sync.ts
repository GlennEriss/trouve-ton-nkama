"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

/**
 * Synchronisation du cache entre onglets du back-office.
 *
 * Problème résolu : le cache React Query vit en mémoire, il est donc propre à
 * chaque onglet. Quand un admin ajoute un quartier dans l'onglet
 * « Géolocalisation », les autres onglets continuent d'afficher l'ancienne
 * liste — il fallait recharger la page, ce qui faisait perdre le travail en
 * cours (typiquement un scrap Apify à moitié rempli).
 *
 * Deuxième problème, indépendant des onglets : la même donnée est mise en cache
 * sous plusieurs clés selon la page qui la consomme. Rafraîchir l'une ne
 * rafraîchissait pas les autres, même dans un seul onglet.
 *
 * On règle les deux : un événement diffusé via BroadcastChannel invalide, dans
 * TOUS les onglets, TOUTES les clés qui portent la donnée concernée.
 */

const CHANNEL_NAME = "tonnkama-admin-sync";

export type AdminSyncEvent =
  /** Villes / quartiers / provinces modifiés (création, édition, suppression, sync OSM). */
  | { type: "geolocation:updated" };

/**
 * Toutes les clés sous lesquelles la référence géographique est mise en cache.
 *
 * Elles sont volontairement listées ici plutôt qu'unifiées : les trois pages
 * consommatrices typent la réponse différemment, fusionner les clés les
 * ferait partager une entrée de cache au typage incompatible. Si une nouvelle
 * page consomme /api/admin/v1/osm/gabon, ajouter sa clé ici.
 */
const GEOLOCATION_QUERY_KEYS: unknown[][] = [
  ["dashboard", "geolocation", "gabon-osm"],
  ["osm", "gabon", "selector"],
];

function invalidateForEvent(queryClient: QueryClient, event: AdminSyncEvent) {
  if (event.type === "geolocation:updated") {
    for (const key of GEOLOCATION_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }
}

/** BroadcastChannel est absent côté serveur et sur quelques navigateurs anciens. */
function createChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/**
 * Écouteur global : monté une seule fois (AppProviders), il réagit aux
 * événements émis par les autres onglets.
 */
export function useAdminSyncListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = createChannel();
    if (!channel) {
      return;
    }

    const onMessage = (message: MessageEvent<AdminSyncEvent>) => {
      if (!message.data?.type) {
        return;
      }
      invalidateForEvent(queryClient, message.data);
    };

    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [queryClient]);
}

/**
 * Signale une modification aux autres onglets ET rafraîchit l'onglet courant.
 *
 * BroadcastChannel ne renvoie pas le message à son émetteur : sans
 * l'invalidation locale, la page qui vient de muter garderait ses autres clés
 * périmées.
 */
export function useAdminSyncPublisher() {
  const queryClient = useQueryClient();

  // Référence stable : ces handlers sont appelés depuis des useCallback, une
  // fonction recréée à chaque rendu y introduirait une dépendance instable.
  return useCallback(
    (event: AdminSyncEvent) => {
      invalidateForEvent(queryClient, event);

      const channel = createChannel();
      if (!channel) {
        return;
      }
      try {
        channel.postMessage(event);
      } finally {
        channel.close();
      }
    },
    [queryClient],
  );
}
