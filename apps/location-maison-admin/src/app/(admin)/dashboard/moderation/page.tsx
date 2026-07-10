"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type PendingListing = {
  id: string;
  title: string;
  description: string;
  typeProperty: string | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  price: number | null;
  area: number | null;
  city: string | null;
  province: string | null;
  createdBy: string | null;
  primaryImageUrl: string | null;
  imageCount: number;
  createdAt: string | null;
};

type PendingListingsPayload = {
  listings: PendingListing[];
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

async function fetchJson<T>(url: string, fallbackMessage: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateLabel(value?: string | null) {
  if (!value) {
    return "Inconnu";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Inconnu";
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusLabel(status: "FOR_RENT" | "FOR_SALE" | null) {
  return status === "FOR_SALE" ? "À vendre" : "À louer";
}

type RejectDialogState = { listingId: string; title: string } | null;

export default function ModerationQueuePage() {
  const queryClient = useQueryClient();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });
  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canApprove = permissions.includes("listings.approve") || permissions.includes("*.*");
  const canReject = permissions.includes("listings.reject") || permissions.includes("*.*");

  const pendingQuery = useQuery({
    queryKey: ["dashboard", "moderation", "pending"],
    queryFn: () =>
      fetchJson<PendingListingsPayload>(
        "/api/admin/v1/listings/moderation/pending?limit=50",
        "Impossible de charger la file de modération.",
      ),
  });

  const listings = useMemo(() => pendingQuery.data?.listings ?? [], [pendingQuery.data]);

  const openRejectDialog = useCallback((listing: PendingListing) => {
    setGlobalError(null);
    setReasonDraft("");
    setRejectDialog({ listingId: listing.id, title: listing.title || "cette annonce" });
  }, []);

  const closeRejectDialog = useCallback(() => {
    setRejectDialog(null);
    setReasonDraft("");
    setIsSubmittingReason(false);
  }, []);

  const approveListing = useCallback(
    async (listingId: string) => {
      setMutatingId(listingId);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        await fetchJson(
          `/api/admin/v1/listings/${listingId}/moderation/approve`,
          "Impossible d'approuver l'annonce.",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
        );
        setGlobalMessage("Annonce approuvée et publiée.");
        await queryClient.invalidateQueries({ queryKey: ["dashboard", "moderation", "pending"] });
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible d'approuver l'annonce.");
      } finally {
        setMutatingId(null);
      }
    },
    [queryClient],
  );

  const confirmReject = useCallback(async () => {
    if (!rejectDialog) return;
    const reason = reasonDraft.trim();
    if (reason.length < 3) {
      setGlobalError("Le motif doit contenir au moins 3 caractères.");
      return;
    }

    setIsSubmittingReason(true);
    setGlobalError(null);
    setGlobalMessage(null);

    try {
      await fetchJson(
        `/api/admin/v1/listings/${rejectDialog.listingId}/moderation/reject`,
        "Impossible de rejeter l'annonce.",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) },
      );
      setGlobalMessage("Annonce rejetée.");
      closeRejectDialog();
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "moderation", "pending"] });
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Impossible de rejeter l'annonce.");
      setIsSubmittingReason(false);
    }
  }, [rejectDialog, reasonDraft, closeRejectDialog, queryClient]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="File de modération"
        description="Annonces en attente de review, les plus anciennes en premier. Approuvez pour publier, ou rejetez avec un motif communiqué à l'annonceur."
      />

      {globalError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      ) : null}
      {globalMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {globalMessage}
        </div>
      ) : null}

      {pendingQuery.isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : pendingQuery.isError ? (
        <p className="text-sm text-red-600">
          {pendingQuery.error instanceof Error ? pendingQuery.error.message : "Erreur de chargement."}
        </p>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            Aucune annonce en attente. La file est vide.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <div className="relative h-40 w-full bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.primaryImageUrl || "/fallback-image.jpg"}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardContent className="space-y-2 p-4">
                <p className="line-clamp-2 font-semibold text-slate-900">{listing.title || "Annonce sans titre"}</p>
                <p className="text-xs text-slate-500">
                  {listing.typeProperty ?? "N/A"} • {statusLabel(listing.status)}
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {formatMoney(listing.price)} {listing.area ? `• ${listing.area} m²` : ""}
                </p>
                <p className="text-xs text-slate-600">
                  {(listing.city ?? "N/A") + ", " + (listing.province ?? "N/A")}
                </p>
                <p className="text-xs text-slate-400">Annonceur : {listing.createdBy ?? "inconnu"}</p>
                <p className="text-xs text-slate-400">Créée le {toDateLabel(listing.createdAt)}</p>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.assign(`/dashboard/listings/${listing.id}`)}
                  >
                    Voir fiche
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canApprove || mutatingId === listing.id}
                    onClick={() => void approveListing(listing.id)}
                  >
                    Approuver
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    disabled={!canReject || mutatingId === listing.id}
                    onClick={() => openRejectDialog(listing)}
                  >
                    Rejeter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectDialog !== null} onOpenChange={(open) => (open ? undefined : closeRejectDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter {rejectDialog?.title}</DialogTitle>
            <DialogDescription>
              Le motif sera visible par l&apos;annonceur dans son tableau de bord et dans la notification qu&apos;il reçoit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="reject-reason" className="text-sm font-medium text-slate-700">
              Motif obligatoire
            </label>
            <Input
              id="reject-reason"
              value={reasonDraft}
              onChange={(event) => setReasonDraft(event.target.value)}
              placeholder="Ex: photos insuffisantes, prix incohérent, informations manquantes"
              disabled={isSubmittingReason}
              autoFocus
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Annuler</Button>} />
            <Button type="button" disabled={isSubmittingReason} onClick={() => void confirmReject()}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
