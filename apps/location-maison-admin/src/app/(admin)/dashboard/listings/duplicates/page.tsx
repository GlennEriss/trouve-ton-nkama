"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type DuplicateResolutionAction =
  | "not_duplicate"
  | "confirm_duplicate"
  | "archive_target"
  | "keep_one_archive_others"
  | "needs_review";

type DuplicateReason =
  | "same_signature"
  | "same_primary_image"
  | "semantic_similarity";

type DuplicateGroup = {
  clusterId: string;
  fingerprint: string;
  reason: DuplicateReason;
  confidence: number;
  semanticScore: number | null;
  scoreBreakdown: {
    textScore: number | null;
    priceScore: number | null;
    locationScore: number | null;
  } | null;
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
    state: "IN_PROGRESS" | "ARCHIVED" | string | null;
    city: string | null;
    province: string | null;
    primaryImageUrl: string | null;
    createdAt: string | null;
  }>;
};

type DedupAdvancedSettings = {
  semanticEnabled: boolean;
  semanticCandidateThreshold: number;
  semanticClusterThreshold: number;
  textWeight: number;
  priceWeight: number;
  locationWeight: number;
  maxListingsForSemantic: number;
  maxBlockSize: number;
  minTextTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

type DedupMonitoringMetrics = {
  measuredAt: string;
  totalClustersDetected: number;
  semanticClustersDetected: number;
  resolvedClusters: number;
  unresolvedClusters: number;
  truePositiveDecisions: number;
  falsePositiveDecisions: number;
  pendingReviewDecisions: number;
  precision: number | null;
  recallProxy: number | null;
  reviewCoverage: number;
};

type DuplicatesPayload = {
  groups: DuplicateGroup[];
  scanned: number;
  returned: number;
  resolvedCount: number;
  unresolvedCount: number;
  semanticGroupsCount: number;
  matchingVersion: string;
};

type RecomputePayload = DuplicatesPayload & {
  metrics: DedupMonitoringMetrics;
};

type DuplicateClusterPayload = {
  cluster: DuplicateGroup;
  scanned: number;
};

type DedupSettingsPayload = {
  settings: DedupAdvancedSettings;
};

type DedupMetricsPayload = {
  metrics: DedupMonitoringMetrics;
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

function formatRate(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return value.toFixed(2);
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

function reasonLabel(reason: DuplicateReason) {
  if (reason === "same_signature") {
    return "Signature quasi identique";
  }
  if (reason === "same_primary_image") {
    return "Même image principale";
  }
  return "Similarité sémantique";
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
  if (action === "keep_one_archive_others") {
    return "Résolu (1 conservée, autres archivées)";
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
  const [includeSemantic, setIncludeSemantic] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [targetListingId, setTargetListingId] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [isDeletingAllArchived, setIsDeletingAllArchived] = useState(false);
  const [hardDeleteReason, setHardDeleteReason] = useState(
    "Suppression definitive annonce doublon archivee depuis module dedup.",
  );
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [settingsPatch, setSettingsPatch] = useState<
    Partial<DedupAdvancedSettings>
  >({});

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
  const canHardDeleteListings = useMemo(
    () => hasPermission(permissions, "listings.delete.hard") && roles.includes("super_admin"),
    [permissions, roles],
  );

  const duplicatesQuery = useQuery({
    queryKey: [
      "dashboard",
      "listings",
      "duplicates",
      includeResolved ? "all" : "open",
      includeSemantic ? "semantic-on" : "semantic-off",
    ],
    enabled: canReadDuplicates,
    queryFn: () =>
      fetchJson<DuplicatesPayload>(
        `/api/admin/v1/listings/duplicates?limit=1200&minGroupSize=2&includeResolved=${includeResolved ? "true" : "false"}&includeSemantic=${includeSemantic ? "true" : "false"}`,
        "Impossible de charger les clusters de doublons.",
      ),
  });

  const clusterQuery = useQuery({
    queryKey: [
      "dashboard",
      "listings",
      "duplicates",
      "cluster",
      selectedClusterId,
      includeSemantic ? "semantic-on" : "semantic-off",
    ],
    enabled: canReadDuplicates && Boolean(selectedClusterId),
    queryFn: () =>
      fetchJson<DuplicateClusterPayload>(
        `/api/admin/v1/listings/duplicates/${selectedClusterId}?limit=1200&minGroupSize=2&includeSemantic=${includeSemantic ? "true" : "false"}`,
        "Impossible de charger le détail du cluster.",
      ),
  });
  const selectedCluster = clusterQuery.data?.cluster ?? null;

  const settingsQuery = useQuery({
    queryKey: ["dashboard", "listings", "duplicates", "settings"],
    enabled: canReadDuplicates,
    queryFn: () =>
      fetchJson<DedupSettingsPayload>(
        "/api/admin/v1/listings/duplicates/settings",
        "Impossible de charger la configuration dedup.",
      ),
  });

  const metricsQuery = useQuery({
    queryKey: [
      "dashboard",
      "listings",
      "duplicates",
      "metrics",
      includeSemantic ? "semantic-on" : "semantic-off",
    ],
    enabled: canReadDuplicates,
    queryFn: () =>
      fetchJson<DedupMetricsPayload>(
        `/api/admin/v1/listings/duplicates/metrics?limit=1200&minGroupSize=2&includeSemantic=${includeSemantic ? "true" : "false"}`,
        "Impossible de charger les métriques de qualité.",
      ),
  });

  const settingsFromServer = settingsQuery.data?.settings ?? null;
  const settingsDraft = useMemo(() => {
    if (!settingsFromServer) {
      return null;
    }
    return {
      ...settingsFromServer,
      ...settingsPatch,
    };
  }, [settingsFromServer, settingsPatch]);

  const hasError =
    permissionsQuery.isError ||
    duplicatesQuery.isError ||
    settingsQuery.isError ||
    metricsQuery.isError ||
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
    void metricsQuery.refetch();
    if (selectedClusterId) {
      void clusterQuery.refetch();
    }
  }, [
    canReadDuplicates,
    clusterQuery,
    duplicatesQuery,
    metricsQuery,
    selectedClusterId,
  ]);

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
          includeSemantic,
        }),
      });

      const payload = (await response.json()) as
        | {
            success: true;
            data: RecomputePayload;
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
        `Recalcul terminé: ${payload.data.returned} clusters visibles, ${payload.data.resolvedCount} traités, ${payload.data.unresolvedCount} ouverts, précision ${formatRate(payload.data.metrics.precision)}.`,
      );

      await Promise.all([
        duplicatesQuery.refetch(),
        metricsQuery.refetch(),
        selectedClusterId ? clusterQuery.refetch() : Promise.resolve(),
      ]);
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
    includeSemantic,
    metricsQuery,
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

      if (
        (action === "archive_target" ||
          action === "keep_one_archive_others") &&
        !targetListingId.trim()
      ) {
        setGlobalError(
          action === "keep_one_archive_others"
            ? "Sélectionne l'annonce à conserver."
            : "Sélectionne l'annonce cible à archiver.",
        );
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
                action === "archive_target" ||
                action === "keep_one_archive_others"
                  ? targetListingId.trim()
                  : undefined,
              note: decisionNote.trim() || undefined,
              limit: 1200,
              minGroupSize: 2,
              includeSemantic,
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

        setGlobalMessage(`Décision enregistrée: ${resolutionLabel(action)}.`);
        await Promise.all([
          duplicatesQuery.refetch(),
          clusterQuery.refetch(),
          metricsQuery.refetch(),
        ]);
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
      includeSemantic,
      metricsQuery,
      selectedClusterId,
      targetListingId,
    ],
  );

  const deleteListingHard = useCallback(
    async (listingId: string) => {
      const reason = hardDeleteReason.trim();
      if (!reason || reason.length < 10) {
        throw new Error("Renseigne un motif de suppression d'au moins 10 caractères.");
      }

      const response = await fetch(`/api/admin/v1/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          confirmPropertyId: listingId,
          confirmation: "SUPPRIMER",
        }),
      });

      const payload = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Impossible de supprimer l'annonce."
            : payload.error?.message || "Impossible de supprimer l'annonce.",
        );
      }
    },
    [hardDeleteReason],
  );

  const deleteOneArchivedListing = useCallback(
    async (listingId: string) => {
      if (!canHardDeleteListings) {
        setGlobalError("Permission manquante : listings.delete.hard (super_admin requis).");
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setDeletingListingId(listingId);

      try {
        await deleteListingHard(listingId);
        setGlobalMessage(`Annonce supprimée définitivement: ${listingId}.`);
        await Promise.all([
          duplicatesQuery.refetch(),
          clusterQuery.refetch(),
          metricsQuery.refetch(),
        ]);
      } catch (error) {
        setGlobalError(
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'annonce.",
        );
      } finally {
        setDeletingListingId(null);
      }
    },
    [
      canHardDeleteListings,
      clusterQuery,
      deleteListingHard,
      duplicatesQuery,
      metricsQuery,
    ],
  );

  const deleteArchivedBatch = useCallback(
    async (listingIds: string[]) => {
      let successCount = 0;
      const failedIds: string[] = [];

      for (const listingId of listingIds) {
        try {
          await deleteListingHard(listingId);
          successCount += 1;
        } catch (_error) {
          failedIds.push(listingId);
        }
      }

      return {
        successCount,
        failedIds,
      };
    },
    [deleteListingHard],
  );

  const deleteAllArchivedInCluster = useCallback(async () => {
    if (!canHardDeleteListings) {
      setGlobalError("Permission manquante : listings.delete.hard (super_admin requis).");
      return;
    }

    if (!selectedCluster) {
      setGlobalError("Sélectionne un cluster.");
      return;
    }

    const archivedListingIds = selectedCluster.listings
      .filter((listing) => listing.state === "ARCHIVED")
      .map((listing) => listing.id);

    if (!archivedListingIds.length) {
      setGlobalError("Aucune annonce archivée à supprimer définitivement dans ce cluster.");
      return;
    }

    setGlobalError(null);
    setGlobalMessage(null);
    setIsDeletingAllArchived(true);

    try {
      const { successCount, failedIds } = await deleteArchivedBatch(
        archivedListingIds,
      );

      if (failedIds.length) {
        setGlobalError(
          `Suppression partielle: ${successCount}/${archivedListingIds.length} annonces supprimées. Échecs: ${failedIds.join(", ")}`,
        );
      } else {
        setGlobalMessage(
          `${successCount} annonces archivées supprimées définitivement dans le cluster.`,
        );
      }

      await Promise.all([
        duplicatesQuery.refetch(),
        clusterQuery.refetch(),
        metricsQuery.refetch(),
      ]);
    } finally {
      setIsDeletingAllArchived(false);
    }
  }, [
    canHardDeleteListings,
    clusterQuery,
    deleteArchivedBatch,
    duplicatesQuery,
    metricsQuery,
    selectedCluster,
  ]);

  const updateNumericSetting = useCallback(
    (
      key:
        | "semanticCandidateThreshold"
        | "semanticClusterThreshold"
        | "textWeight"
        | "priceWeight"
        | "locationWeight"
        | "maxListingsForSemantic"
        | "maxBlockSize"
        | "minTextTokens",
      rawValue: string,
    ) => {
      const parsedValue = Number(rawValue);
      if (!Number.isFinite(parsedValue)) {
        return;
      }

      setSettingsPatch((previous) => ({
        ...previous,
        [key]:
          key === "maxListingsForSemantic" ||
          key === "maxBlockSize" ||
          key === "minTextTokens"
            ? Math.trunc(parsedValue)
            : parsedValue,
      }));
    },
    [],
  );

  const saveSettings = useCallback(async () => {
    if (!canRecomputeDuplicates) {
      setGlobalError("Permission manquante : listings.duplicates.recompute");
      return;
    }
    if (!settingsDraft) {
      setGlobalError("Configuration dedup non chargée.");
      return;
    }

    setGlobalError(null);
    setGlobalMessage(null);
    setIsSavingSettings(true);

    try {
      const response = await fetch("/api/admin/v1/listings/duplicates/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          semanticEnabled: settingsDraft.semanticEnabled,
          semanticCandidateThreshold: settingsDraft.semanticCandidateThreshold,
          semanticClusterThreshold: settingsDraft.semanticClusterThreshold,
          textWeight: settingsDraft.textWeight,
          priceWeight: settingsDraft.priceWeight,
          locationWeight: settingsDraft.locationWeight,
          maxListingsForSemantic: settingsDraft.maxListingsForSemantic,
          maxBlockSize: settingsDraft.maxBlockSize,
          minTextTokens: settingsDraft.minTextTokens,
        }),
      });

      const payload = (await response.json()) as
        | { success: true; data: DedupSettingsPayload }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? "Impossible de sauvegarder la configuration."
            : payload.error?.message ||
                "Impossible de sauvegarder la configuration.",
        );
      }

      setSettingsPatch({});
      setGlobalMessage("Configuration dedup avancée enregistrée.");
      await Promise.all([
        settingsQuery.refetch(),
        duplicatesQuery.refetch(),
        metricsQuery.refetch(),
      ]);
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : "Impossible de sauvegarder la configuration.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }, [
    canRecomputeDuplicates,
    duplicatesQuery,
    metricsQuery,
    settingsDraft,
    settingsQuery,
  ]);

  const selectedClusterArchivedListings = useMemo(
    () =>
      selectedCluster?.listings.filter((listing) => listing.state === "ARCHIVED") ??
      [],
    [selectedCluster],
  );

  const archivedClustersInView = useMemo(() => {
    const groups = duplicatesQuery.data?.groups ?? [];
    return groups
      .map((group) => {
        const archivedListings = group.listings.filter(
          (listing) => listing.state === "ARCHIVED",
        );

        return {
          clusterId: group.clusterId,
          reason: group.reason,
          resolutionAction: group.resolution?.action ?? null,
          archivedListings,
        };
      })
      .filter((group) => group.archivedListings.length > 0);
  }, [duplicatesQuery.data?.groups]);

  const archivedListingCountInView = useMemo(
    () =>
      archivedClustersInView.reduce(
        (sum, group) => sum + group.archivedListings.length,
        0,
      ),
    [archivedClustersInView],
  );

  const deleteArchivedClusterInView = useCallback(
    async (clusterId: string, listingIds: string[]) => {
      if (!canHardDeleteListings) {
        setGlobalError(
          "Permission manquante : listings.delete.hard (super_admin requis).",
        );
        return;
      }
      if (!listingIds.length) {
        setGlobalError(
          "Aucune annonce archivée à supprimer définitivement dans ce cluster.",
        );
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsDeletingAllArchived(true);

      try {
        const { successCount, failedIds } = await deleteArchivedBatch(listingIds);
        if (failedIds.length) {
          setGlobalError(
            `Suppression partielle cluster ${clusterId}: ${successCount}/${listingIds.length} annonces supprimées. Échecs: ${failedIds.join(", ")}`,
          );
        } else {
          setGlobalMessage(
            `${successCount} annonces archivées supprimées définitivement dans le cluster ${clusterId}.`,
          );
        }

        await Promise.all([
          duplicatesQuery.refetch(),
          selectedClusterId ? clusterQuery.refetch() : Promise.resolve(),
          metricsQuery.refetch(),
        ]);
      } finally {
        setIsDeletingAllArchived(false);
      }
    },
    [
      canHardDeleteListings,
      clusterQuery,
      deleteArchivedBatch,
      duplicatesQuery,
      metricsQuery,
      selectedClusterId,
    ],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doublons d'annonces"
        description="Analyse, qualification et résolution des clusters suspects (Sprint D inclus)."
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
              variant={includeSemantic ? "default" : "outline"}
              onClick={() => setIncludeSemantic((previous) => !previous)}
            >
              {includeSemantic
                ? "Sémantique activée"
                : "Sémantique désactivée"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={refreshAll}
              disabled={
                duplicatesQuery.isFetching ||
                clusterQuery.isFetching ||
                metricsQuery.isFetching
              }
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
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          Permission manquante: listings.duplicates.read
        </div>
      ) : null}

      {hasError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Certaines données n&apos;ont pas pu être chargées.
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      {globalMessage ? (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {globalMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Annonces scannées</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(duplicatesQuery.data?.scanned ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Clusters visibles</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(duplicatesQuery.data?.returned ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Clusters traités</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(duplicatesQuery.data?.resolvedCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Clusters sémantiques</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(duplicatesQuery.data?.semanticGroupsCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Version matching</p>
            <p className="text-sm font-semibold text-foreground">
              {duplicatesQuery.data?.matchingVersion ?? "N/A"}
            </p>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Précision</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatRate(metricsQuery.data?.metrics.precision)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Rappel proxy</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatRate(metricsQuery.data?.metrics.recallProxy)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Couverture review</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatRate(metricsQuery.data?.metrics.reviewCoverage)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Mesure</p>
            <p className="text-sm font-semibold text-foreground">
              {toDateLabel(metricsQuery.data?.metrics.measuredAt ?? null)}
            </p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Paramètres dedup avancés
          </h2>
          <p className="text-sm text-muted-foreground">
            Ajuste les seuils sémantiques (Sprint D), puis relance un recalcul.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settingsDraft ? (
            <p className="text-sm text-muted-foreground">
              Chargement de la configuration...
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <input
                  id="semanticEnabled"
                  type="checkbox"
                  className="size-4"
                  checked={settingsDraft.semanticEnabled}
                  onChange={(event) =>
                    setSettingsPatch((previous) => ({
                      ...previous,
                      semanticEnabled: event.target.checked,
                    }))
                  }
                  disabled={!canRecomputeDuplicates}
                />
                <label
                  htmlFor="semanticEnabled"
                  className="text-sm font-medium text-foreground"
                >
                  Activer la similarité sémantique
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Seuil candidat sémantique
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0.4}
                    max={0.99}
                    value={settingsDraft.semanticCandidateThreshold}
                    onChange={(event) =>
                      updateNumericSetting(
                        "semanticCandidateThreshold",
                        event.target.value,
                      )
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Seuil cluster sémantique
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0.5}
                    max={0.995}
                    value={settingsDraft.semanticClusterThreshold}
                    onChange={(event) =>
                      updateNumericSetting(
                        "semanticClusterThreshold",
                        event.target.value,
                      )
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Min tokens texte
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min={2}
                    max={20}
                    value={settingsDraft.minTextTokens}
                    onChange={(event) =>
                      updateNumericSetting("minTextTokens", event.target.value)
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Poids texte
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={settingsDraft.textWeight}
                    onChange={(event) =>
                      updateNumericSetting("textWeight", event.target.value)
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Poids prix
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={settingsDraft.priceWeight}
                    onChange={(event) =>
                      updateNumericSetting("priceWeight", event.target.value)
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Poids localisation
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={settingsDraft.locationWeight}
                    onChange={(event) =>
                      updateNumericSetting("locationWeight", event.target.value)
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Limite annonces pour sémantique
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min={100}
                    max={4000}
                    value={settingsDraft.maxListingsForSemantic}
                    onChange={(event) =>
                      updateNumericSetting(
                        "maxListingsForSemantic",
                        event.target.value,
                      )
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Taille max d&apos;un bloc
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min={20}
                    max={500}
                    value={settingsDraft.maxBlockSize}
                    onChange={(event) =>
                      updateNumericSetting("maxBlockSize", event.target.value)
                    }
                    disabled={!canRecomputeDuplicates}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <p>
                  Dernière mise à jour: {toDateLabel(settingsDraft.updatedAt)} par{" "}
                  {settingsDraft.updatedBy ?? "Inconnu"}
                </p>
                <Button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={!canRecomputeDuplicates || isSavingSettings}
                >
                  Enregistrer la configuration
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Clusters détectés
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Cluster</th>
                  <th className="py-2 pr-4 font-medium">Raison</th>
                  <th className="py-2 pr-4 font-medium">Confiance</th>
                  <th className="py-2 pr-4 font-medium">Score sémantique</th>
                  <th className="py-2 pr-4 font-medium">Volume</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 pr-4 font-medium">Aperçu annonces</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {duplicatesQuery.data?.groups.length ? (
                  duplicatesQuery.data.groups.map((group) => (
                    <tr key={group.clusterId} className="border-b border-border align-top">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">
                        {group.clusterId}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {reasonLabel(group.reason)}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {group.confidence}%
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {group.reason === "semantic_similarity"
                          ? formatScore(group.semanticScore)
                          : "N/A"}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {formatNumber(group.listings.length)} annonces
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        <p>{resolutionLabel(group.resolution?.action ?? null)}</p>
                        <p className="text-xs text-muted-foreground">
                          {toDateLabel(group.resolution?.reviewedAt ?? null)}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
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
                    <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
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
          <h2 className="text-base font-semibold text-foreground">
            Doublons archivés (vue globale)
          </h2>
          <p className="text-sm text-muted-foreground">
            Nettoyage rapide des annonces déjà archivées sur les clusters affichés.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
            <p>
              Clusters avec archivées:{" "}
              <span className="font-semibold">
                {formatNumber(archivedClustersInView.length)}
              </span>
            </p>
            <p>
              Annonces archivées visibles:{" "}
              <span className="font-semibold">
                {formatNumber(archivedListingCountInView)}
              </span>
            </p>
          </div>

          {archivedClustersInView.length ? (
            <div className="space-y-3">
              {archivedClustersInView.map((group) => (
                <div
                  key={`archived_cluster_${group.clusterId}`}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {group.clusterId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reasonLabel(group.reason)} • décision:{" "}
                        {resolutionLabel(group.resolutionAction)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectCluster(group.clusterId)}
                      >
                        Ouvrir le cluster
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={
                          !canHardDeleteListings ||
                          isDeletingAllArchived ||
                          isResolving
                        }
                        onClick={() =>
                          void deleteArchivedClusterInView(
                            group.clusterId,
                            group.archivedListings.map((listing) => listing.id),
                          )
                        }
                      >
                        Supprimer archivées du cluster
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.archivedListings.map((listing) => (
                      <div
                        key={`archived_global_${group.clusterId}_${listing.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {listing.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{listing.id}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={
                            !canHardDeleteListings ||
                            isDeletingAllArchived ||
                            deletingListingId === listing.id
                          }
                          onClick={() => void deleteOneArchivedListing(listing.id)}
                        >
                          Supprimer définitivement
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune annonce archivée détectée sur les clusters actuellement affichés.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">
            Détail du cluster
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedClusterId
              ? `Cluster sélectionné: ${selectedClusterId}`
              : "Sélectionne un cluster pour le traiter."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedClusterId ? (
            <p className="text-sm text-muted-foreground">Aucun cluster sélectionné.</p>
          ) : clusterQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              Chargement du détail du cluster...
            </p>
          ) : !selectedCluster ? (
            <p className="text-sm text-muted-foreground">Cluster introuvable.</p>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
                <p>
                  <span className="font-medium">Raison:</span>{" "}
                  {reasonLabel(selectedCluster.reason)}
                </p>
                <p>
                  <span className="font-medium">Confiance:</span>{" "}
                  {selectedCluster.confidence}%
                </p>
                {selectedCluster.reason === "semantic_similarity" ? (
                  <p>
                    <span className="font-medium">Score sémantique:</span>{" "}
                    {formatScore(selectedCluster.semanticScore)} | texte{" "}
                    {formatScore(selectedCluster.scoreBreakdown?.textScore)} | prix{" "}
                    {formatScore(selectedCluster.scoreBreakdown?.priceScore)} |
                    localisation{" "}
                    {formatScore(selectedCluster.scoreBreakdown?.locationScore)}
                  </p>
                ) : null}
                <p>
                  <span className="font-medium">Dernière décision:</span>{" "}
                  {resolutionLabel(selectedCluster.resolution?.action ?? null)}
                </p>
              </div>

              <div className="space-y-2">
                {selectedCluster.listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {listing.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{listing.id}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>{statusLabel(listing.status)}</p>
                      <p>{stateLabel(listing.state)}</p>
                      <p>{formatMoney(listing.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Annonce de référence (à conserver)
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
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
                  <p className="text-[11px] text-muted-foreground">
                    Utilisé pour &quot;Conserver 1, archiver les autres&quot; et &quot;Archiver la cible&quot;.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Note de décision (optionnel)
                  </label>
                  <textarea
                    className="min-h-[78px] w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground"
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
                      onClick={() =>
                        void resolveCluster("keep_one_archive_others")
                      }
                    >
                      Conserver 1, archiver les autres
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

              <div className="rounded-lg border border-border bg-muted p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Annonces archivées du cluster
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(selectedClusterArchivedListings.length)} annonces archivées
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      !canHardDeleteListings ||
                      isDeletingAllArchived ||
                      isResolving ||
                      selectedClusterArchivedListings.length === 0
                    }
                    onClick={() => void deleteAllArchivedInCluster()}
                  >
                    Supprimer toutes les archivées
                  </Button>
                </div>

                <div className="mb-3 space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Motif suppression définitive
                  </label>
                  <Input
                    value={hardDeleteReason}
                    onChange={(event) => setHardDeleteReason(event.target.value)}
                    placeholder="Motif obligatoire (min 10 caractères)"
                    disabled={!canHardDeleteListings || isDeletingAllArchived}
                  />
                </div>

                {!canHardDeleteListings ? (
                  <p className="mb-2 text-xs text-warning">
                    Seul le super_admin peut supprimer définitivement les annonces archivées.
                  </p>
                ) : null}

                {selectedClusterArchivedListings.length ? (
                  <div className="space-y-2">
                    {selectedClusterArchivedListings.map((listing) => (
                      <div
                        key={`archived_${listing.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {listing.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{listing.id}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={
                            !canHardDeleteListings ||
                            isDeletingAllArchived ||
                            deletingListingId === listing.id
                          }
                          onClick={() => void deleteOneArchivedListing(listing.id)}
                        >
                          Supprimer définitivement
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Aucune annonce archivée dans ce cluster.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
