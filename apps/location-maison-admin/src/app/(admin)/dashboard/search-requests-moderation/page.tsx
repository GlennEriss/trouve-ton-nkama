"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import type { SearchRequestListItem } from "@/modules/search-requests-moderation/domain/types";

type PendingSearchRequestsResponse = {
  items: SearchRequestListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

async function fetchPendingSearchRequests(): Promise<PendingSearchRequestsResponse> {
  const response = await fetch("/api/admin/v1/search-requests/moderation/pending", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de charger la file de modération.");
  }
  return payload.data as PendingSearchRequestsResponse;
}

async function submitDecision(searchRequestId: string, decision: "approve" | "reject", reason?: string) {
  const response = await fetch(`/api/admin/v1/search-requests/${searchRequestId}/moderation/${decision}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Échec de l'action.");
  }
}

function formatBudget(item: SearchRequestListItem): string {
  return `${item.budgetMinXaf.toLocaleString("fr-FR")} - ${item.budgetMaxXaf.toLocaleString("fr-FR")} FCFA`;
}

export default function SearchRequestsModerationPage() {
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["search-requests-moderation", "pending"],
    queryFn: fetchPendingSearchRequests,
  });

  const handleDecision = async (searchRequestId: string, decision: "approve" | "reject") => {
    let reason: string | undefined;
    if (decision === "reject") {
      reason = window.prompt("Motif du rejet (obligatoire, 3 caractères minimum) :")?.trim();
      if (!reason || reason.length < 3) return;
    }

    setActioningId(searchRequestId);
    try {
      await submitDecision(searchRequestId, decision, reason);
      await queryClient.invalidateQueries({ queryKey: ["search-requests-moderation", "pending"] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modération des demandes de recherche"
        description="Demandes payées en attente de validation avant publication sur /demandes-recherche."
      />

      {pendingQuery.isLoading && <p className="text-sm text-slate-500">Chargement...</p>}
      {pendingQuery.isError && (
        <p className="text-sm text-red-600">
          {pendingQuery.error instanceof Error ? pendingQuery.error.message : "Erreur de chargement."}
        </p>
      )}
      {pendingQuery.data && pendingQuery.data.items.length === 0 && (
        <p className="text-sm text-slate-500">Aucune demande en attente de modération.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingQuery.data?.items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {item.typeProperty} · {item.transactionType === "FOR_RENT" ? "Location" : "Vente"}
                </span>
                {item.boostPaid && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Sparkles className="h-3 w-3" /> Boost payé
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-0.5">
                <p>
                  {item.city}
                  {item.neighborhood ? `, ${item.neighborhood}` : ""} ({item.province})
                </p>
                <p>Budget : {formatBudget(item)}</p>
                <p>WhatsApp : {item.whatsappContact}</p>
                <p>Montant payé : {item.amountPaidXaf.toLocaleString("fr-FR")} FCFA</p>
              </div>

              <p className="text-sm text-slate-700 line-clamp-4">{item.description}</p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-9 text-emerald-700 hover:bg-emerald-50"
                  disabled={actioningId === item.id}
                  onClick={() => handleDecision(item.id, "approve")}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-red-600 hover:bg-red-50"
                  disabled={actioningId === item.id}
                  onClick={() => handleDecision(item.id, "reject")}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
