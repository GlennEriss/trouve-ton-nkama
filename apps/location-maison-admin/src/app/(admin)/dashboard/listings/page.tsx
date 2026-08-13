"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";
import { formatPriceFCFA } from "@trouve-ton-nkama/core/utils";

type ListingStatusFilter = "all" | "FOR_RENT" | "FOR_SALE";
type ListingStateFilter = "all" | "IN_PROGRESS" | "ARCHIVED";
type DuplicateStateFilter = "all" | "suspected" | "confirmed" | "resolved";

type ListingRow = {
  id: string;
  title: string;
  description: string;
  typeProperty: string | null;
  status: "FOR_RENT" | "FOR_SALE" | null;
  state: "IN_PROGRESS" | "ARCHIVED" | string | null;
  price: number | null;
  area: number | null;
  city: string | null;
  province: string | null;
  country: string | null;
  createdBy: string | null;
  tags: string[];
  primaryImageUrl: string | null;
  imageCount: number;
  duplicateState?: "suspected" | "confirmed" | "resolved" | "none";
  createdAt: string | null;
  updatedAt: string | null;
};

type ListingsPayload = {
  listings: ListingRow[];
  count: number;
  totalCount: number | null;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  summary: {
    inProgressCount: number;
    archivedCount: number;
    forRentCount: number;
    forSaleCount: number;
  };
};

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type AppliedFilters = {
  query: string;
  createdBy: string;
  status: ListingStatusFilter;
  state: ListingStateFilter;
  duplicateState: DuplicateStateFilter;
  typeProperty: string[];
  province: string[];
  city: string[];
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
  dateFrom: string;
  dateTo: string;
};

type ReasonDialogAction =
  | {
      kind: "single-state";
      listingId: string;
      nextState: "IN_PROGRESS" | "ARCHIVED";
    }
  | {
      kind: "bulk-state";
      nextState: "IN_PROGRESS" | "ARCHIVED";
    }
  | {
      kind: "bulk-status";
      nextStatus: "FOR_RENT" | "FOR_SALE";
    };

const PROPERTY_TYPES = [
  "Home",
  "Studio",
  "Apartment",
  "Desk",
  "Building",
  "Shop",
  "Kiosk",
  "Room",
  "Property",
  "Logement",
  "Villa",
  "Land",
];

const EMPTY_FILTERS: AppliedFilters = {
  query: "",
  createdBy: "",
  status: "all",
  state: "all",
  duplicateState: "all",
  typeProperty: [],
  province: [],
  city: [],
  priceMin: "",
  priceMax: "",
  areaMin: "",
  areaMax: "",
  dateFrom: "",
  dateTo: "",
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("fr-FR").format(value);
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

function duplicateStateLabel(state?: "suspected" | "confirmed" | "resolved" | "none") {
  if (state === "suspected") {
    return "Suspect";
  }
  if (state === "confirmed") {
    return "Confirmé";
  }
  if (state === "resolved") {
    return "Résolu";
  }
  return "Aucun";
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

function buildQueryParams(limit: number, cursor: string | null, filters: AppliedFilters) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  if (filters.query) params.set("query", filters.query);
  if (filters.createdBy) params.set("createdBy", filters.createdBy);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.state !== "all") params.set("state", filters.state);
  if (filters.duplicateState !== "all") params.set("duplicateState", filters.duplicateState);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.areaMin) params.set("areaMin", filters.areaMin);
  if (filters.areaMax) params.set("areaMax", filters.areaMax);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  filters.typeProperty.forEach((value) => params.append("typeProperty", value));
  filters.province.forEach((value) => params.append("province", value));
  filters.city.forEach((value) => params.append("city", value));

  return params;
}

export default function ListingsDashboardPage() {
  const searchParams = useSearchParams();
  const [queryDraft, setQueryDraft] = useState("");
  const [createdByDraft, setCreatedByDraft] = useState("");
  const [typePropertyDraft, setTypePropertyDraft] = useState("");
  const [provinceDraft, setProvinceDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [priceMinDraft, setPriceMinDraft] = useState("");
  const [priceMaxDraft, setPriceMaxDraft] = useState("");
  const [areaMinDraft, setAreaMinDraft] = useState("");
  const [areaMaxDraft, setAreaMaxDraft] = useState("");
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  const [status, setStatus] = useState<ListingStatusFilter>("all");
  const [state, setState] = useState<ListingStateFilter>("all");
  const [duplicateState, setDuplicateState] = useState<DuplicateStateFilter>("all");

  const [filtersApplied, setFiltersApplied] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [isBulkMutating, setIsBulkMutating] = useState(false);
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null);
  const [reasonDialogAction, setReasonDialogAction] = useState<ReasonDialogAction | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  const limit = 40;
  const createdPropertyId = searchParams.get("created") === "1" ? searchParams.get("propertyId")?.trim() : null;
  const createdListingMessage = createdPropertyId
    ? `Annonce créée avec succès: ${createdPropertyId}`
    : searchParams.get("created") === "1"
      ? "Annonce créée avec succès."
      : null;

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = useMemo(
    () => permissionsQuery.data?.admin.permissions ?? [],
    [permissionsQuery.data?.admin.permissions],
  );

  const listingsQuery = useQuery({
    queryKey: ["dashboard", "listings", "list", limit, cursor, filtersApplied],
    queryFn: () => {
      const params = buildQueryParams(limit, cursor, filtersApplied);
      return fetchJson<ListingsPayload>(
        `/api/admin/v1/listings?${params.toString()}`,
        "Impossible de charger les annonces.",
      );
    },
  });

  const canExportListings = useMemo(() => hasPermission(permissions, "listings.export"), [permissions]);
  const canCreateListing = useMemo(() => hasPermission(permissions, "listings.create"), [permissions]);
  const canArchiveListing = useMemo(
    () => hasPermission(permissions, "listings.reject") || hasPermission(permissions, "listings.state.update"),
    [permissions],
  );
  const canRestoreListing = useMemo(
    () => hasPermission(permissions, "listings.approve") || hasPermission(permissions, "listings.state.update"),
    [permissions],
  );
  const canBulkArchive = useMemo(
    () => hasPermission(permissions, "listings.bulk.archive") || hasPermission(permissions, "listings.reject"),
    [permissions],
  );
  const canBulkRestore = useMemo(
    () => hasPermission(permissions, "listings.bulk.unarchive") || hasPermission(permissions, "listings.approve"),
    [permissions],
  );
  const canBulkStatus = useMemo(
    () => hasPermission(permissions, "listings.bulk.update") || hasPermission(permissions, "listings.status.update"),
    [permissions],
  );

  const selectedIdsSet = useMemo(() => new Set(selectedListingIds), [selectedListingIds]);
  const visibleListingIds = useMemo(
    () => (listingsQuery.data?.listings ?? []).map((listing) => listing.id),
    [listingsQuery.data?.listings],
  );

  const allVisibleSelected = useMemo(
    () =>
      visibleListingIds.length > 0 &&
      visibleListingIds.every((id) => selectedIdsSet.has(id)),
    [selectedIdsSet, visibleListingIds],
  );

  const duplicateCountInView = useMemo(
    () =>
      (listingsQuery.data?.listings ?? []).filter(
        (listing) => listing.duplicateState && listing.duplicateState !== "none",
      ).length,
    [listingsQuery.data?.listings],
  );

  const nextCursor = listingsQuery.data?.page.nextCursor ?? null;

  const onApplyFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGlobalMessage(null);
      setGlobalError(null);

      const nextFilters: AppliedFilters = {
        query: queryDraft.trim(),
        createdBy: createdByDraft.trim(),
        status,
        state,
        duplicateState,
        typeProperty: splitCsv(typePropertyDraft),
        province: splitCsv(provinceDraft),
        city: splitCsv(cityDraft),
        priceMin: priceMinDraft.trim(),
        priceMax: priceMaxDraft.trim(),
        areaMin: areaMinDraft.trim(),
        areaMax: areaMaxDraft.trim(),
        dateFrom: dateFromDraft.trim(),
        dateTo: dateToDraft.trim(),
      };

      setFiltersApplied(nextFilters);
      setCursor(null);
      setCursorHistory([]);
      setSelectedListingIds([]);
    },
    [
      areaMaxDraft,
      areaMinDraft,
      cityDraft,
      createdByDraft,
      dateFromDraft,
      dateToDraft,
      duplicateState,
      priceMaxDraft,
      priceMinDraft,
      provinceDraft,
      queryDraft,
      state,
      status,
      typePropertyDraft,
    ],
  );

  const onResetFilters = useCallback(() => {
    setGlobalMessage(null);
    setGlobalError(null);

    setQueryDraft("");
    setCreatedByDraft("");
    setTypePropertyDraft("");
    setProvinceDraft("");
    setCityDraft("");
    setPriceMinDraft("");
    setPriceMaxDraft("");
    setAreaMinDraft("");
    setAreaMaxDraft("");
    setDateFromDraft("");
    setDateToDraft("");
    setStatus("all");
    setState("all");
    setDuplicateState("all");

    setFiltersApplied(EMPTY_FILTERS);
    setCursor(null);
    setCursorHistory([]);
    setSelectedListingIds([]);
  }, []);

  const onNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((previous) => [...previous, cursor ?? ""]);
    setCursor(nextCursor);
    setSelectedListingIds([]);
  }, [cursor, nextCursor]);

  const onPreviousPage = useCallback(() => {
    if (cursorHistory.length === 0) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? "";
    setCursorHistory((previous) => previous.slice(0, -1));
    setCursor(previousCursor || null);
    setSelectedListingIds([]);
  }, [cursorHistory]);

  const refreshAll = useCallback(() => {
    setGlobalMessage(null);
    setGlobalError(null);
    void listingsQuery.refetch();
  }, [listingsQuery]);

  const exportCsv = useCallback(() => {
    if (!canExportListings) {
      setGlobalError("Permission manquante : listings.export");
      return;
    }

    const params = buildQueryParams(limit, null, filtersApplied);
    params.delete("limit");
    window.location.assign(`/api/admin/v1/listings/export?${params.toString()}`);
  }, [canExportListings, filtersApplied]);

  const openCreateListing = useCallback(() => {
    const announcerUidPrefill = createdByDraft.trim() || filtersApplied.createdBy.trim();
    const params = new URLSearchParams();
    if (announcerUidPrefill) {
      params.set("announcerUid", announcerUidPrefill);
    }
    window.location.assign(
      params.toString() ? `/dashboard/listings/new?${params.toString()}` : "/dashboard/listings/new",
    );
  }, [createdByDraft, filtersApplied.createdBy]);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedListingIds((previous) => {
      if (allVisibleSelected) {
        return previous.filter((id) => !visibleListingIds.includes(id));
      }
      const merged = new Set(previous);
      visibleListingIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }, [allVisibleSelected, visibleListingIds]);

  const toggleSelectListing = useCallback((listingId: string) => {
    setSelectedListingIds((previous) => {
      if (previous.includes(listingId)) {
        return previous.filter((id) => id !== listingId);
      }
      return [...previous, listingId];
    });
  }, []);

  const openReasonDialog = useCallback((action: ReasonDialogAction) => {
    setGlobalError(null);
    setReasonDraft("");
    setReasonDialogAction(action);
  }, []);

  const closeReasonDialog = useCallback(() => {
    setReasonDialogAction(null);
    setReasonDraft("");
    setIsSubmittingReason(false);
  }, []);

  const changeListingState = useCallback(
    async (listingId: string, nextState: "IN_PROGRESS" | "ARCHIVED", reason: string) => {
      setIsMutatingId(listingId);
      setGlobalError(null);
      setGlobalMessage(null);

      try {
        const response = await fetch(`/api/admin/v1/listings/${listingId}/state`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state: nextState, reason }),
        });

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de changer l'état." : payload.error?.message);
        }

        await listingsQuery.refetch();
        setGlobalMessage(nextState === "ARCHIVED" ? "Annonce archivée." : "Annonce restaurée.");
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de changer l'état.");
      } finally {
        setIsMutatingId(null);
      }
    },
    [listingsQuery],
  );

  const changeListingsStateBulk = useCallback(
    async (nextState: "IN_PROGRESS" | "ARCHIVED", reason: string) => {
      if (!selectedListingIds.length) {
        setGlobalError("Sélectionne au moins une annonce.");
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsBulkMutating(true);

      try {
        const endpoint =
          nextState === "ARCHIVED"
            ? "/api/admin/v1/listings/bulk/archive"
            : "/api/admin/v1/listings/bulk/unarchive";

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyIds: selectedListingIds,
            reason,
          }),
        });

        const payload = (await response.json()) as
          | {
              success: true;
              data: {
                updatedCount: number;
                notFoundCount: number;
                failedCount: number;
              };
            }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? "Impossible d'appliquer l'action en masse."
              : payload.error?.message || "Impossible d'appliquer l'action en masse.",
          );
        }

        setGlobalMessage(
          `Action bulk terminée: ${payload.data.updatedCount} mises à jour, ${payload.data.notFoundCount} introuvables, ${payload.data.failedCount} en échec.`,
        );
        setSelectedListingIds([]);
        await listingsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible d'appliquer l'action en masse.");
      } finally {
        setIsBulkMutating(false);
      }
    },
    [listingsQuery, selectedListingIds],
  );

  const bulkChangeStatus = useCallback(
    async (nextStatus: "FOR_RENT" | "FOR_SALE", reason: string) => {
      if (!selectedListingIds.length) {
        setGlobalError("Sélectionne au moins une annonce.");
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsBulkMutating(true);

      try {
        const response = await fetch("/api/admin/v1/listings/bulk/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyIds: selectedListingIds,
            status: nextStatus,
            reason,
          }),
        });

        const payload = (await response.json()) as
          | {
              success: true;
              data: {
                updatedCount: number;
                notFoundCount: number;
                failedCount: number;
              };
            }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? "Impossible de mettre à jour les statuts en masse."
              : payload.error?.message || "Impossible de mettre à jour les statuts en masse.",
          );
        }

        setGlobalMessage(
          `Bulk statut terminé: ${payload.data.updatedCount} mises à jour, ${payload.data.notFoundCount} introuvables, ${payload.data.failedCount} en échec.`,
        );
        setSelectedListingIds([]);
        await listingsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de mettre à jour les statuts en masse.");
      } finally {
        setIsBulkMutating(false);
      }
    },
    [listingsQuery, selectedListingIds],
  );

  const reasonDialogMeta = useMemo(() => {
    if (!reasonDialogAction) {
      return {
        title: "",
        description: "",
        confirmLabel: "",
      };
    }

    if (reasonDialogAction.kind === "single-state") {
      const isArchive = reasonDialogAction.nextState === "ARCHIVED";
      return {
        title: isArchive ? "Archiver l'annonce" : "Restaurer l'annonce",
        description: "Renseigne le motif obligatoire pour tracer cette action.",
        confirmLabel: isArchive ? "Archiver" : "Restaurer",
      };
    }

    if (reasonDialogAction.kind === "bulk-state") {
      const isArchive = reasonDialogAction.nextState === "ARCHIVED";
      return {
        title: isArchive ? "Archiver la sélection" : "Restaurer la sélection",
        description: "Le motif s'appliquera à toutes les annonces sélectionnées.",
        confirmLabel: isArchive ? "Archiver la sélection" : "Restaurer la sélection",
      };
    }

    const isRent = reasonDialogAction.nextStatus === "FOR_RENT";
    return {
      title: isRent ? "Mettre la sélection à louer" : "Mettre la sélection à vendre",
      description: "Le motif est obligatoire pour la traçabilité des changements de statut.",
      confirmLabel: isRent ? "Passer à louer" : "Passer à vendre",
    };
  }, [reasonDialogAction]);

  const onConfirmReason = useCallback(async () => {
    if (!reasonDialogAction) {
      return;
    }

    const reason = reasonDraft.trim();
    if (!reason) {
      setGlobalError("Le motif est obligatoire.");
      return;
    }

    setIsSubmittingReason(true);
    try {
      if (reasonDialogAction.kind === "single-state") {
        await changeListingState(reasonDialogAction.listingId, reasonDialogAction.nextState, reason);
      } else if (reasonDialogAction.kind === "bulk-state") {
        await changeListingsStateBulk(reasonDialogAction.nextState, reason);
      } else {
        await bulkChangeStatus(reasonDialogAction.nextStatus, reason);
      }
      closeReasonDialog();
    } finally {
      setIsSubmittingReason(false);
    }
  }, [
    bulkChangeStatus,
    changeListingState,
    changeListingsStateBulk,
    closeReasonDialog,
    reasonDialogAction,
    reasonDraft,
  ]);

  const hasError = listingsQuery.isError || permissionsQuery.isError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des annonces"
        description="Filtres avancés, modération, actions bulk et export alignés à la vue courante."
        actions={
          <div className="flex items-center gap-2">
            {canCreateListing ? (
              <Button type="button" variant="outline" onClick={openCreateListing}>
                Nouvelle annonce
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign("/dashboard/listings/duplicates")}
            >
              Module doublons
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={!canExportListings}>
              Export CSV
            </Button>
            <Button type="button" variant="outline" onClick={refreshAll} disabled={listingsQuery.isFetching}>
              Actualiser
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Filtres avancés</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onApplyFilters}>
            <Input
              placeholder="Recherche libre"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
            />
            <Input
              placeholder="UID annonceur"
              value={createdByDraft}
              onChange={(event) => setCreatedByDraft(event.target.value)}
            />
            <Input
              placeholder="Type(s) annonce, ex: Home,Studio"
              value={typePropertyDraft}
              onChange={(event) => setTypePropertyDraft(event.target.value)}
              list="listing-type-hints"
            />
            <datalist id="listing-type-hints">
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
            <Input
              placeholder="Province(s), séparées par virgules"
              value={provinceDraft}
              onChange={(event) => setProvinceDraft(event.target.value)}
            />
            <Input
              placeholder="Ville(s), séparées par virgules"
              value={cityDraft}
              onChange={(event) => setCityDraft(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Prix min"
              value={priceMinDraft}
              onChange={(event) => setPriceMinDraft(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Prix max"
              value={priceMaxDraft}
              onChange={(event) => setPriceMaxDraft(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Surface min"
              value={areaMinDraft}
              onChange={(event) => setAreaMinDraft(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Surface max"
              value={areaMaxDraft}
              onChange={(event) => setAreaMaxDraft(event.target.value)}
            />
            <Input type="date" value={dateFromDraft} onChange={(event) => setDateFromDraft(event.target.value)} />
            <Input type="date" value={dateToDraft} onChange={(event) => setDateToDraft(event.target.value)} />
            <select
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={status}
              onChange={(event) => setStatus(event.target.value as ListingStatusFilter)}
            >
              <option value="all">Tous les statuts</option>
              <option value="FOR_RENT">À louer</option>
              <option value="FOR_SALE">À vendre</option>
            </select>
            <select
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={state}
              onChange={(event) => setState(event.target.value as ListingStateFilter)}
            >
              <option value="all">Tous les états</option>
              <option value="IN_PROGRESS">Actif</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
            <select
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={duplicateState}
              onChange={(event) => setDuplicateState(event.target.value as DuplicateStateFilter)}
            >
              <option value="all">Tous les doublons</option>
              <option value="suspected">Suspects</option>
              <option value="confirmed">Confirmés</option>
              <option value="resolved">Résolus</option>
            </select>
            <div className="flex items-center gap-2">
              <Button type="submit">Appliquer</Button>
              <Button type="button" variant="outline" onClick={onResetFilters}>
                Réinitialiser
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Résultats page</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(listingsQuery.data?.count ?? 0)}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Actives</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(listingsQuery.data?.summary.inProgressCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Archivées</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(listingsQuery.data?.summary.archivedCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">À louer</p>
            <p className="text-2xl font-semibold text-foreground">
              {formatNumber(listingsQuery.data?.summary.forRentCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Doublons page</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(duplicateCountInView)}</p>
          </CardHeader>
        </Card>
      </section>

      {hasError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Certaines données n&apos;ont pas pu être chargées.
        </div>
      ) : null}

      {globalError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{globalError}</div>
      ) : null}

      {globalMessage ? (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {globalMessage}
        </div>
      ) : null}

      {!globalMessage && !globalError && createdListingMessage ? (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {createdListingMessage}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Annonces</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
            <p className="text-sm text-foreground">
              Sélection actuelle: <span className="font-semibold">{formatNumber(selectedListingIds.length)}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkArchive || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => openReasonDialog({ kind: "bulk-state", nextState: "ARCHIVED" })}
              >
                Archiver sélection
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkRestore || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => openReasonDialog({ kind: "bulk-state", nextState: "IN_PROGRESS" })}
              >
                Restaurer sélection
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkStatus || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => openReasonDialog({ kind: "bulk-status", nextStatus: "FOR_RENT" })}
              >
                Statut bulk: à louer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkStatus || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => openReasonDialog({ kind: "bulk-status", nextStatus: "FOR_SALE" })}
              >
                Statut bulk: à vendre
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={visibleListingIds.length === 0}
                    />
                  </th>
                  <th className="py-2 pr-4 font-medium">Annonce</th>
                  <th className="py-2 pr-4 font-medium">Type / Statut</th>
                  <th className="py-2 pr-4 font-medium">Prix / Surface</th>
                  <th className="py-2 pr-4 font-medium">Localisation</th>
                  <th className="py-2 pr-4 font-medium">Doublon</th>
                  <th className="py-2 pr-4 font-medium">État</th>
                  <th className="py-2 pr-4 font-medium">Créée le</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listingsQuery.data?.listings.length ? (
                  listingsQuery.data.listings.map((listing) => (
                    <tr
                      key={listing.id}
                      className={`border-b border-border align-top ${
                        selectedIdsSet.has(listing.id) ? "bg-success/10/40" : ""
                      }`}
                    >
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(listing.id)}
                          onChange={() => toggleSelectListing(listing.id)}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <p className="font-medium text-foreground">{listing.title}</p>
                        <p className="max-w-[260px] truncate text-xs text-muted-foreground">{listing.id}</p>
                        <p className="text-xs text-muted-foreground">{listing.createdBy ?? "N/A"}</p>
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        <p>{listing.typeProperty ?? "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{statusLabel(listing.status)}</p>
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        <p>{formatPriceFCFA(listing.price)}</p>
                        <p className="text-xs text-muted-foreground">{formatNumber(listing.area)} m²</p>
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {(listing.city ?? "N/A") + ", " + (listing.province ?? "N/A")}
                      </td>
                      <td className="py-2 pr-4 text-foreground">{duplicateStateLabel(listing.duplicateState)}</td>
                      <td className="py-2 pr-4 text-foreground">{stateLabel(listing.state)}</td>
                      <td className="py-2 pr-4 text-foreground">{toDateLabel(listing.createdAt)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.assign(`/dashboard/listings/${listing.id}`)}
                          >
                            Voir fiche
                          </Button>
                          {listing.state === "ARCHIVED" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!canRestoreListing || isMutatingId === listing.id}
                              onClick={() =>
                                openReasonDialog({
                                  kind: "single-state",
                                  listingId: listing.id,
                                  nextState: "IN_PROGRESS",
                                })
                              }
                            >
                              Restaurer
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canArchiveListing || isMutatingId === listing.id}
                              onClick={() =>
                                openReasonDialog({
                                  kind: "single-state",
                                  listingId: listing.id,
                                  nextState: "ARCHIVED",
                                })
                              }
                            >
                              Archiver
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                      Aucune annonce trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onPreviousPage}
              disabled={cursorHistory.length === 0 || listingsQuery.isFetching}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onNextPage}
              disabled={!listingsQuery.data?.page.hasMore || listingsQuery.isFetching}
            >
              Suivant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reasonDialogAction !== null} onOpenChange={(open) => (open ? undefined : closeReasonDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonDialogMeta.title}</DialogTitle>
            <DialogDescription>{reasonDialogMeta.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="listing-reason" className="text-sm font-medium text-foreground">
              Motif obligatoire
            </label>
            <Input
              id="listing-reason"
              value={reasonDraft}
              onChange={(event) => setReasonDraft(event.target.value)}
              placeholder="Ex: doublon confirmé après vérification"
              disabled={isSubmittingReason}
              autoFocus
            />
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
            <Button type="button" disabled={isSubmittingReason} onClick={() => void onConfirmReason()}>
              {reasonDialogMeta.confirmLabel || "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
