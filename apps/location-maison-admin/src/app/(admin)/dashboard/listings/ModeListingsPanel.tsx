"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent } from "@trouve-ton-nkama/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import type { CategoryListingSummary } from "@/modules/category-listing/infrastructure/category-listing.repository";

type CategoryListingsPayload = {
  listings: CategoryListingSummary[];
  count: number;
};

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

function toDateLabel(value: string | null) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

const MODERATION_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Publiée",
  REJECTED: "Rejetée",
};

/**
 * Onglet "Mode" du module Annonces (voir ListingsDashboardPage). Volontairement une table
 * simple, distincte du panneau immobilier (ImmobilierListingsPanel, 14 filtres construits
 * autour de typeProperty) : ces annonces n'ont pas cette forme, un filtre/table dédié léger
 * évite de retrofiter le composant immobilier existant, plus risqué que d'en écrire un neuf.
 */
export default function ModeListingsPanel() {
  const listingsQuery = useQuery({
    queryKey: ["dashboard", "category-listings"],
    queryFn: () =>
      fetchJson<CategoryListingsPayload>("/api/admin/v1/category-listings", "Impossible de charger les annonces."),
  });

  const listings = listingsQuery.data?.listings ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annonces multi-catégorie"
        description="Mode et catégories futures hors immobilier — moteur générique, voir docs/marketplace-multi-categories."
        actions={
          <Button asChild>
            <Link href="/dashboard/category-listings/new">
              <Plus className="mr-1.5 h-4 w-4" /> Nouvelle annonce
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          {listingsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : listingsQuery.error ? (
            <p className="text-sm text-destructive">{listingsQuery.error.message}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Titre</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">Prix</th>
                  <th className="px-3 py-2">Ville</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Créée le</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-t">
                    <td className="px-3 py-2 font-medium text-foreground">{listing.title || "Sans titre"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{listing.categoryPath?.lvl1 ?? listing.categoryId}</td>
                    <td className="px-3 py-2">{listing.price.toLocaleString("fr-FR")} FCFA</td>
                    <td className="px-3 py-2">{listing.city || "—"}</td>
                    <td className="px-3 py-2">
                      {MODERATION_LABELS[listing.moderationStatus] ?? listing.moderationStatus}
                      {listing.moderationStatus === "REJECTED" && listing.rejectionReason ? (
                        <span className="block text-xs text-destructive">Motif : {listing.rejectionReason}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{toDateLabel(listing.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/annonce/${listing.id}`} target="_blank" rel="noreferrer">
                          Voir
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
                {listings.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      Aucune annonce multi-catégorie pour le moment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
