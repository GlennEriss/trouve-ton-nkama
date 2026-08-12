"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type ListingClaimReview = {
  id: string;
  uid: string;
  verifiedPhone: string;
  matchCount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string | null;
  lastAttemptAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  announcerLabel: string | null;
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

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

function toDateLabel(value: string | null | undefined) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default function ListingClaimsDashboardPage() {
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = useMemo(() => permissionsQuery.data?.admin.permissions ?? [], [permissionsQuery.data?.admin.permissions]);
  const canRead = useMemo(() => hasPermission(permissions, "listings.read"), [permissions]);
  const canReview = useMemo(() => hasPermission(permissions, "listings.update"), [permissions]);

  const reviewsQuery = useQuery({
    queryKey: ["dashboard", "listing-claims"],
    queryFn: () =>
      fetchJson<{ reviews: ListingClaimReview[] }>("/api/admin/v1/listing-claims", "Impossible de charger les revues."),
    enabled: canRead,
  });

  const reviews = reviewsQuery.data?.reviews ?? [];

  const handleAction = useCallback(
    async (reviewId: string, action: "approve" | "reject") => {
      if (!canReview) return;
      setGlobalMessage(null);
      setGlobalError(null);
      setPendingActionId(reviewId);
      try {
        const response = await fetch(`/api/admin/v1/listing-claims/${encodeURIComponent(reviewId)}/${action}`, {
          method: "POST",
        });
        const payload = (await response.json()) as
          | { success: true; data: { claimedCount?: number } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Action impossible." : payload.error?.message || "Action impossible.");
        }

        setGlobalMessage(
          action === "approve"
            ? `Revue approuvée : ${payload.data.claimedCount ?? 0} annonce(s) rattachée(s).`
            : "Revue rejetée.",
        );
        await reviewsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Action impossible.");
      } finally {
        setPendingActionId(null);
      }
    },
    [canReview, reviewsQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendications d'annonces"
        description="Lots d'auto-attribution bloqués (numéro correspondant à trop d'annonces) — à valider ou rejeter manuellement."
        actions={
          <Button variant="outline" onClick={() => void reviewsQuery.refetch()} disabled={reviewsQuery.isFetching}>
            Actualiser
          </Button>
        }
      />

      {globalError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{globalError}</p> : null}
      {globalMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{globalMessage}</p>
      ) : null}

      {!canRead ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-600">
            Permission insuffisante : <code>listings.read</code> requise pour consulter les revendications.
          </CardContent>
        </Card>
      ) : null}

      {canRead ? (
        <Card>
          <CardHeader className="pb-2 text-sm font-medium text-slate-700">
            En attente ({reviews.length})
          </CardHeader>
          <CardContent>
            {reviewsQuery.isLoading ? <p className="text-sm text-slate-500">Chargement...</p> : null}
            {reviewsQuery.isError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {reviewsQuery.error instanceof Error ? reviewsQuery.error.message : "Erreur lors du chargement."}
              </p>
            ) : null}

            {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune revendication en attente.</p>
            ) : null}

            {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length > 0 ? (
              <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Annonceur</th>
                      <th className="px-3 py-2 font-medium">Numéro vérifié</th>
                      <th className="px-3 py-2 font-medium">Annonces concernées</th>
                      <th className="px-3 py-2 font-medium">Dernière tentative</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-900">
                          {review.announcerLabel ?? review.uid}
                          <Badge variant="warning" className="ml-2">
                            En attente
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{review.verifiedPhone}</td>
                        <td className="px-3 py-2 text-slate-700">{review.matchCount}</td>
                        <td className="px-3 py-2 text-slate-700">{toDateLabel(review.lastAttemptAt ?? review.createdAt)}</td>
                        <td className="px-3 py-2">
                          {canReview ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void handleAction(review.id, "approve")}
                                disabled={pendingActionId === review.id}
                              >
                                Approuver
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => void handleAction(review.id, "reject")}
                                disabled={pendingActionId === review.id}
                              >
                                Rejeter
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
