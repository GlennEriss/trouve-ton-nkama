"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";

type DuplicateResolutionAction =
  | "not_duplicate"
  | "confirm_duplicate"
  | "archive_target"
  | "needs_review";

type DuplicateGroup = {
  clusterId: string;
  fingerprint: string;
  reason: "same_signature" | "same_primary_image";
  confidence: number;
  resolution: {
    action: DuplicateResolutionAction;
    note: string | null;
    targetListingId: string | null;
    actorUid: string;
    actorRoles: string[];
    reviewedAt: string | null;
  } | null;
  listings: Array<{
    id: string;
    title: string;
    createdBy: string | null;
    price: number | null;
    status: "FOR_RENT" | "FOR_SALE" | null;
    state: string | null;
    city: string | null;
    province: string | null;
    primaryImageUrl: string | null;
    createdAt: string | null;
  }>;
};

type DuplicatesPayload = {
  groups: DuplicateGroup[];
  scanned: number;
  returned: number;
  resolvedCount: number;
  unresolvedCount: number;
};

type DuplicateClusterPayload = {
  cluster: DuplicateGroup;
  scanned: number;
};

type AuthMePayload = {
  admin: {
    roles: string[];
    permissions: string[];
  };
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function canFinalizeDuplicateDecisions(roles: string[]) {
  return roles.some(
    (role) =>
      role === "super_admin" ||
      role === "operations_admin" ||
      role === "moderation_admin",
  );
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
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

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: "FOR_RENT" | "FOR_SALE" | null) {
  if (status === "FOR_RENT") {
    return "À louer";
  }
  if (status === "FOR_SALE") {
    return "À vendre";
  }
  return "N/A";
}

function stateLabel(state: string | null) {
  if (state === "IN_PROGRESS") {
    return "Actif";
  }
  if (state === "ARCHIVED") {
    return "Archivé";
  }
  return state ?? "N/A";
}

function reasonLabel(reason: DuplicateGroup["reason"]) {
  return reason === "same_signature"
    ? "Signature quasi identique"
    : "Même image principale";
}

function resolutionLabel(action: DuplicateResolutionAction | null) {
  if (!action) {
    return "Non traité";
  }
  if (action === "not_duplicate") {
    return "Pas un doublon";
  }
  if (action === "confirm_duplicate") {
    return "Doublon confirmé";
  }
  if (action === "archive_target") {
    return "Résolu (cible archivée)";
  }
  return "À revoir";
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.success
        ? fallbackMessage
        : payload.error?.message || fallbackMessage,
    );
  }

  return payload.data;
}

export default function ListingsDuplicatesDashboardPage() {
  const [includeResolved, setIncludeResolved] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [targetListingId, setTargetListingId] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>(
        "/api/admin/v1/auth/me",
        "Impossible de charger les permissions.",
      ),
  });

  const permissions = useMemo(
    () => permissionsQuery.data?.admin.permissions ?? [],
    [permissionsQuery.data?.admin.permissions],
  );
  const roles = useMemo(
    () => permissionsQuery.data?.admin.roles ?? [],
    [permissionsQuery.data?.admin.roles],
  );

  const canReadDuplicates = useMemo(
    () => hasPermission(permissions, "listings.duplicates.read"),
    [permissions],
  );
  const canResolveDuplicates = useMemo(
    () => hasPermission(permissions, "listings.duplicates.resolve"),
    [permissions],
  );
  const canRecomputeDuplicates = useMemo(
    () => hasPermission(permissions, "listings.duplicates.recompute"),
    [permissions],
  );
  const canFinalizeDecisions = useMemo(
    () => canFinalizeDuplicateDecisions(roles),
    [roles],
  );

  const duplicatesQuery = useQuery({
    queryKey: [
      "dashboard",
      "listings",
      "duplicates",
      includeResolved ? "all" : "open",
    ],
    enabled: canReadDuplicates,
    queryFn: () =>
      fetchJson<DuplicatesPayload>(
        `/api/admin/v1/listings/duplicates?limit=1200&minGroupSize=2&includeResolved=${includeResolved ? "true" : "false"}`,
        "Impossible de charger les clusters de doublons.",
      ),
  });

  const clusterQuery = useQuery({
    queryKey: ["dashboard", "listings", "duplicates", "cluster", selectedClusterId],
    enabled: canReadDuplicates && Boolean(selectedClusterId),
    queryFn: () =>
      fetchJson<DuplicateClusterPayload>(
        `/api/admin/v1/listings/duplicates/${selectedClusterId}?limit=1200&minGroupSize=2`,
        "Impossible de charger le détail du cluster.",
      ),
  });

  const hasError =
    permissionsQuery.isError ||
    duplicatesQuery.isError ||
    (selectedClusterId ? clusterQuery.isError : false);

  const onSelectCluster = useCallback((clusterId: string) => {
    setSelectedClusterId(clusterId);
    setDecisionNote("");
    setTargetListingId("");
    setGlobalError(null);
    setGlobalMessage(null);
  }, []);

  const refreshAll = useCallback(() => {
    if (!canReadDuplicates) {
      return;
    }
    setGlobalMessage(null);
    void duplicatesQuery.refetch();
    if (selectedClusterId) {
      void clusterQuery.refetch();
    }
  }, [canReadDuplicates, clusterQuery, duplicatesQuery, selectedClusterId]);

  const recompute = useCallback(async () => {
    if (!canRecomputeDuplicates) {
      setGlobalError("Permission manquante : listings.duplicates.recompute");
      return;
    }

    setGlobalError(null);
    setGlobalMessage(null);
    setIsRecomputing(true);

    try {
      const response = await fetch("/api/admin/v1/listings/duplicates/recompute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 1200,
          minGroupSize: 2,
          includeResolved,
        }),
      });

      const payload = (await response.json()) as
        | {
            success: true;
            data: {
              returned: number;
              resolvedCount: number;
              unresolvedCount: number;
            };
          }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Impossible de recalculer les doublons."
            : payload.error?.message || "Impossible de recalculer les doublons.",
        );
      }

      setGlobalMessage(
        `Recalcul terminé: ${payload.data.returned} clusters visibles, ${payload.data.resolvedCount} traités, ${payload.data.unresolvedCount} ouverts.`,
      );
      if (selectedClusterId) {
        await Promise.all([duplicatesQuery.refetch(), clusterQuery.refetch()]);
      } else {
        await duplicatesQuery.refetch();
      }
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Impossible de recalculer les doublons.",
      );
    } finally {
      setIsRecomputing(false);
    }
  }, [
    canRecomputeDuplicates,
    clusterQuery,
    duplicatesQuery,
    includeResolved,
    selectedClusterId,
  ]);

  const resolveCluster = useCallback(
    async (action: DuplicateResolutionAction) => {
      if (!canResolveDuplicates) {
        setGlobalError("Permission manquante : listings.duplicates.resolve");
        return;
      }
      if (!selectedClusterId) {
        setGlobalError("Sélectionne un cluster.");
        return;
      }

      if (action === "archive_target" && !targetListingId.trim()) {
        setGlobalError("Sélectionne l'annonce cible à archiver.");
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsResolving(true);

      try {
        const response = await fetch(
          `/api/admin/v1/listings/duplicates/${selectedClusterId}/resolve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action,
              targetListingId:
                action === "archive_target" ? targetListingId.trim() : undefined,
              note: decisionNote.trim() || undefined,
              limit: 1200,
              minGroupSize: 2,
            }),
          },
        );

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? "Impossible d'enregistrer cette décision."
              : payload.error?.message ||
                  "Impossible d'enregistrer cette décision.",
          );
        }

        setGlobalMessage(
          `Décision enregistrée: ${resolutionLabel(action)}.`,
        );
        await Promise.all([duplicatesQuery.refetch(), clusterQuery.refetch()]);
      } catch (error) {
        setGlobalError(
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer cette décision.",
        );
      } finally {
        setIsResolving(false);
      }
    },
    [
      canResolveDuplicates,
      clusterQuery,
      decisionNote,
      duplicatesQuery,
      selectedClusterId,
      targetListingId,
    ],
  );

  const selectedCluster = clusterQuery.data?.cluster ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doublons d'annonces"
        description="Analyse, qualification et résolution des clusters suspects."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIncludeResolved((previous) => !previous)}
            >
              {includeResolved
                ? "Masquer les clusters traités"
                : "Afficher les clusters traités"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={refreshAll}
              disabled={duplicatesQuery.isFetching || clusterQuery.isFetching}
            >
              Actualiser
            </Button>
            <Button
              type="button"
              onClick={() => void recompute()}
              disabled={!canRecomputeDuplicates || isRecomputing}
            >
              <RefreshCcw className="mr-2 size-4" />
              Recalculer
            </Button>
          </div>
        }
      />

      {!canReadDuplicates ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Permission manquante: listings.duplicates.read
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Certaines données n&apos;ont pas pu être chargées.
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {globalError}
        </div>
      ) : null}

      {globalMessage ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {globalMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Annonces scannées</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(duplicatesQuery.data?.scanned ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Clusters visibles</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(duplicatesQuery.data?.returned ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Clusters traités</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(duplicatesQuery.data?.resolvedCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Clusters ouverts</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(duplicatesQuery.data?.unresolvedCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">
            Clusters détectés
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">Cluster</th>
                  <th className="py-2 pr-4 font-medium">Raison</th>
                  <th className="py-2 pr-4 font-medium">Confiance</th>
                  <th className="py-2 pr-4 font-medium">Volume</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 pr-4 font-medium">Aperçu annonces</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {duplicatesQuery.data?.groups.length ? (
                  duplicatesQuery.data.groups.map((group) => (
                    <tr key={group.clusterId} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-700">
                        {group.clusterId}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {reasonLabel(group.reason)}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {group.confidence}%
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {formatNumber(group.listings.length)} annonces
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        <p>{resolutionLabel(group.resolution?.action ?? null)}</p>
                        <p className="text-xs text-slate-500">
                          {toDateLabel(group.resolution?.reviewedAt ?? null)}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-600">
                        <div className="space-y-1">
                          {group.listings.slice(0, 2).map((listing) => (
                            <p key={listing.id}>
                              {listing.title} ({listing.id})
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectCluster(group.clusterId)}
                        >
                          Ouvrir
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      Aucun cluster détecté sur l&apos;échantillon actuel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">
            Détail du cluster
          </h2>
          <p className="text-sm text-slate-600">
            {selectedClusterId
              ? `Cluster sélectionné: ${selectedClusterId}`
              : "Sélectionne un cluster pour le traiter."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedClusterId ? (
            <p className="text-sm text-slate-500">
              Aucun cluster sélectionné.
            </p>
          ) : clusterQuery.isLoading ? (
            <p className="text-sm text-slate-500">
              Chargement du détail du cluster...
            </p>
          ) : !selectedCluster ? (
            <p className="text-sm text-slate-500">Cluster introuvable.</p>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Raison:</span>{" "}
                  {reasonLabel(selectedCluster.reason)}
                </p>
                <p>
                  <span className="font-medium">Confiance:</span>{" "}
                  {selectedCluster.confidence}%
                </p>
                <p>
                  <span className="font-medium">Dernière décision:</span>{" "}
                  {resolutionLabel(selectedCluster.resolution?.action ?? null)}
                </p>
              </div>

              <div className="space-y-2">
                {selectedCluster.listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {listing.title}
                      </p>
                      <p className="text-xs text-slate-500">{listing.id}</p>
                    </div>
                    <div className="text-xs text-slate-600">
                      <p>{statusLabel(listing.status)}</p>
                      <p>{stateLabel(listing.state)}</p>
                      <p>{formatMoney(listing.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Annonce cible à archiver
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                    value={targetListingId}
                    onChange={(event) => setTargetListingId(event.target.value)}
                    disabled={!canResolveDuplicates}
                  >
                    <option value="">Sélectionner...</option>
                    {selectedCluster.listings.map((listing) => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title} ({listing.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Note de décision (optionnel)
                  </label>
                  <textarea
                    className="min-h-[78px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Contexte de la décision..."
                    disabled={!canResolveDuplicates}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canResolveDuplicates || isResolving}
                  onClick={() => void resolveCluster("needs_review")}
                >
                  Marquer à revoir
                </Button>
                {canFinalizeDecisions ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canResolveDuplicates || isResolving}
                      onClick={() => void resolveCluster("not_duplicate")}
                    >
                      Pas un doublon
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canResolveDuplicates || isResolving}
                      onClick={() => void resolveCluster("confirm_duplicate")}
                    >
                      Confirmer doublon
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        !canResolveDuplicates ||
                        isResolving ||
                        !targetListingId.trim()
                      }
                      onClick={() => void resolveCluster("archive_target")}
                    >
                      Archiver la cible
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
