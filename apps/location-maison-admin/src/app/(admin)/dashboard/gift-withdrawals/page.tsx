"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Smartphone, XCircle } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import type {
  GiftWithdrawalListItem,
  GiftWithdrawalStatus,
} from "@/modules/gift-withdrawals/domain/types";

type WithdrawalsResponse = {
  items: GiftWithdrawalListItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

const STATUS_FILTERS: Array<{ value: GiftWithdrawalStatus | "TOUS"; label: string }> = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "TRAITE", label: "Versés" },
  { value: "REFUSE", label: "Refusés" },
  { value: "TOUS", label: "Tous" },
];

const STATUS_BADGE: Record<GiftWithdrawalStatus, { label: string; className: string }> = {
  EN_ATTENTE: { label: "En attente", className: "bg-amber-100 text-amber-700" },
  TRAITE: { label: "Versé", className: "bg-emerald-100 text-emerald-700" },
  REFUSE: { label: "Refusé", className: "bg-red-100 text-red-700" },
};

function formatXaf(value: number): string {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function fetchWithdrawals(statut: GiftWithdrawalStatus | "TOUS"): Promise<WithdrawalsResponse> {
  const params = statut === "TOUS" ? "" : `?statut=${statut}`;
  const response = await fetch(`/api/admin/v1/gift-withdrawals${params}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Impossible de charger les demandes de retrait.");
  }
  return payload.data as WithdrawalsResponse;
}

async function submitDecision(withdrawalId: string, decision: "mark-paid" | "reject", motif?: string) {
  const response = await fetch(`/api/admin/v1/gift-withdrawals/${withdrawalId}/${decision}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(motif ? { motif } : {}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Échec de l'action.");
  }
}

export default function GiftWithdrawalsPage() {
  const queryClient = useQueryClient();
  const [statut, setStatut] = useState<GiftWithdrawalStatus | "TOUS">("EN_ATTENTE");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const withdrawalsQuery = useQuery({
    queryKey: ["gift-withdrawals", statut],
    queryFn: () => fetchWithdrawals(statut),
  });

  const handleDecision = async (withdrawalId: string, decision: "mark-paid" | "reject") => {
    let motif: string | undefined;
    if (decision === "reject") {
      motif = window.prompt("Motif du refus (obligatoire, 3 caractères minimum) :")?.trim();
      if (!motif || motif.length < 3) return;
    } else {
      const confirmed = window.confirm(
        "Confirmer : le versement mobile money a bien été envoyé au numéro indiqué ?",
      );
      if (!confirmed) return;
    }

    setActioningId(withdrawalId);
    try {
      await submitDecision(withdrawalId, decision, motif);
      await queryClient.invalidateQueries({ queryKey: ["gift-withdrawals"] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retraits cadeaux"
        description="Demandes de retrait du solde cadeaux des annonceurs. Le versement mobile money est effectué manuellement, puis marqué versé ici."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statut === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatut(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {withdrawalsQuery.isLoading && <p className="text-sm text-slate-500">Chargement...</p>}
      {withdrawalsQuery.isError && (
        <p className="text-sm text-red-600">
          {withdrawalsQuery.error instanceof Error
            ? withdrawalsQuery.error.message
            : "Erreur de chargement."}
        </p>
      )}
      {withdrawalsQuery.data && withdrawalsQuery.data.items.length === 0 && (
        <p className="text-sm text-slate-500">Aucune demande de retrait pour ce filtre.</p>
      )}

      <div className="grid gap-4">
        {withdrawalsQuery.data?.items.map((withdrawal) => {
          const badge = STATUS_BADGE[withdrawal.statut];
          return (
            <Card key={withdrawal.id}>
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(withdrawal.dateCreation)}</span>
                  </div>
                  {/* Le montant NET + numéro sont ce que l'opérateur saisit dans son app MoMo */}
                  <p className="text-lg font-semibold">
                    À verser : {formatXaf(withdrawal.netPayoutXaf)}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-mono font-medium">{withdrawal.numero}</span>
                    <span>· {withdrawal.reseau === "AM" ? "Airtel Money" : "Moov Money"}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Solde débité : {formatXaf(withdrawal.montantXaf)} (frais {formatXaf(withdrawal.feeXaf)})
                    {" · "}Annonceur : <span className="font-mono">{withdrawal.announcerUid}</span>
                  </p>
                  {withdrawal.statut === "REFUSE" && withdrawal.motifRefus && (
                    <p className="text-xs text-red-600">Motif : {withdrawal.motifRefus}</p>
                  )}
                  {withdrawal.statut !== "EN_ATTENTE" && withdrawal.traitePar && (
                    <p className="text-xs text-slate-400">
                      Traité par <span className="font-mono">{withdrawal.traitePar}</span> le{" "}
                      {formatDate(withdrawal.dateMiseAJour)}
                    </p>
                  )}
                </div>

                {withdrawal.statut === "EN_ATTENTE" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      onClick={() => handleDecision(withdrawal.id, "mark-paid")}
                      disabled={actioningId === withdrawal.id}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marquer versé
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDecision(withdrawal.id, "reject")}
                      disabled={actioningId === withdrawal.id}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Refuser
                    </Button>
                  </div>
                )}
                {withdrawal.statut === "EN_ATTENTE" && (
                  <Clock className="hidden h-5 w-5 text-amber-500 md:block" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
