"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type ListingStatusFilter = "all" | "FOR_RENT" | "FOR_SALE";
type ListingStateFilter = "all" | "IN_PROGRESS" | "ARCHIVED";

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

type ListingDetailsPayload = {
  listing: ListingRow & {
    street: string | null;
    countryCode: string | null;
    contact: string | null;
  };
};

type DuplicatesPayload = {
  groups: Array<{
    clusterId: string;
    fingerprint: string;
    reason: "same_signature" | "same_primary_image";
    confidence: number;
    resolution: {
      action: "not_duplicate" | "confirm_duplicate" | "archive_target" | "needs_review";
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
  }>;
  scanned: number;
  returned: number;
  resolvedCount: number;
  unresolvedCount: number;
};

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type EditFormState = {
  id: string;
  title: string;
  description: string;
  typeProperty: string;
  status: "FOR_RENT" | "FOR_SALE";
  price: string;
  area: string;
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  contact: string;
  tagsRaw: string;
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
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

function splitTags(value: string) {
  return value
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
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

function toEditFormState(payload: ListingDetailsPayload["listing"]): EditFormState {
  return {
    id: payload.id,
    title: payload.title ?? "",
    description: payload.description ?? "",
    typeProperty: payload.typeProperty ?? "Home",
    status: payload.status === "FOR_SALE" ? "FOR_SALE" : "FOR_RENT",
    price: payload.price != null ? String(payload.price) : "",
    area: payload.area != null ? String(payload.area) : "",
    street: payload.street ?? "",
    city: payload.city ?? "",
    province: payload.province ?? "",
    country: payload.country ?? "",
    countryCode: payload.countryCode ?? "",
    contact: payload.contact ?? "",
    tagsRaw: payload.tags.join(", "),
  };
}

export default function ListingsDashboardPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [status, setStatus] = useState<ListingStatusFilter>("all");
  const [state, setState] = useState<ListingStateFilter>("all");
  const [createdByDraft, setCreatedByDraft] = useState("");
  const [createdByApplied, setCreatedByApplied] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [isMutatingId, setIsMutatingId] = useState<string | null>(null);
  const [isBulkMutating, setIsBulkMutating] = useState(false);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const limit = 40;

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = useMemo(
    () => permissionsQuery.data?.admin.permissions ?? [],
    [permissionsQuery.data?.admin.permissions],
  );

  const listingsQuery = useQuery({
    queryKey: [
      "dashboard",
      "listings",
      "list",
      limit,
      cursor,
      queryApplied,
      status,
      state,
      createdByApplied,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (cursor) params.set("cursor", cursor);
      if (queryApplied) params.set("query", queryApplied);
      if (status !== "all") params.set("status", status);
      if (state !== "all") params.set("state", state);
      if (createdByApplied) params.set("createdBy", createdByApplied);

      return fetchJson<ListingsPayload>(
        `/api/admin/v1/listings?${params.toString()}`,
        "Impossible de charger les annonces.",
      );
    },
  });

  const duplicatesQuery = useQuery({
    queryKey: ["dashboard", "listings", "duplicates"],
    queryFn: () =>
      fetchJson<DuplicatesPayload>(
        "/api/admin/v1/listings/duplicates?limit=1200&minGroupSize=2",
        "Impossible de charger les doublons d'annonces.",
      ),
  });
  const nextCursor = listingsQuery.data?.page.nextCursor ?? null;

  const canEditListing = useMemo(() => hasPermission(permissions, "listings.update"), [permissions]);
  const canExportListings = useMemo(() => hasPermission(permissions, "listings.export"), [permissions]);
  const canBulkArchive = useMemo(
    () =>
      hasPermission(permissions, "listings.bulk.archive") || hasPermission(permissions, "listings.reject"),
    [permissions],
  );
  const canBulkRestore = useMemo(
    () =>
      hasPermission(permissions, "listings.bulk.unarchive") || hasPermission(permissions, "listings.approve"),
    [permissions],
  );
  const canArchiveListing = useMemo(() => hasPermission(permissions, "listings.reject"), [permissions]);
  const canRestoreListing = useMemo(() => hasPermission(permissions, "listings.approve"), [permissions]);
  const canUseBulkActions = canBulkArchive || canBulkRestore;
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

  const onApplyFilters = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGlobalMessage(null);
      setQueryApplied(queryDraft.trim());
      setCreatedByApplied(createdByDraft.trim());
      setCursor(null);
      setCursorHistory([]);
      setSelectedListingIds([]);
    },
    [createdByDraft, queryDraft],
  );

  const onResetFilters = useCallback(() => {
    setGlobalMessage(null);
    setQueryDraft("");
    setQueryApplied("");
    setStatus("all");
    setState("all");
    setCreatedByDraft("");
    setCreatedByApplied("");
    setCursor(null);
    setCursorHistory([]);
    setSelectedListingIds([]);
  }, []);

  const onNextPage = useCallback(() => {
    if (!nextCursor) {
      return;
    }
    setCursorHistory((previous) => [...previous, cursor ?? ""]);
    setCursor(nextCursor);
    setSelectedListingIds([]);
  }, [cursor, nextCursor]);

  const onPreviousPage = useCallback(() => {
    if (cursorHistory.length === 0) {
      return;
    }
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? "";
    setCursorHistory((previous) => previous.slice(0, -1));
    setCursor(previousCursor || null);
    setSelectedListingIds([]);
  }, [cursorHistory]);

  const refreshAll = useCallback(() => {
    setGlobalMessage(null);
    void listingsQuery.refetch();
    void duplicatesQuery.refetch();
  }, [duplicatesQuery, listingsQuery]);

  const exportCsv = useCallback(() => {
    if (!canExportListings) {
      setGlobalError("Permission manquante : listings.export");
      return;
    }

    setGlobalMessage(null);
    const params = new URLSearchParams();
    if (queryApplied) params.set("query", queryApplied);
    if (status !== "all") params.set("status", status);
    if (state !== "all") params.set("state", state);
    if (createdByApplied) params.set("createdBy", createdByApplied);

    const queryString = params.toString();
    const target = queryString
      ? `/api/admin/v1/listings/export?${queryString}`
      : "/api/admin/v1/listings/export";

    window.location.assign(target);
  }, [canExportListings, createdByApplied, queryApplied, state, status]);

  const changeListingState = useCallback(
    async (listing: ListingRow, nextState: "IN_PROGRESS" | "ARCHIVED") => {
      setGlobalError(null);
      setGlobalMessage(null);
      setIsMutatingId(listing.id);

      try {
        const response = await fetch(`/api/admin/v1/listings/${listing.id}/state`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ state: nextState }),
        });

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de changer l'état de l'annonce." : payload.error?.message);
        }

        await Promise.all([listingsQuery.refetch(), duplicatesQuery.refetch()]);
        setGlobalMessage(
          nextState === "ARCHIVED"
            ? "Annonce archivée avec succès."
            : "Annonce restaurée avec succès.",
        );
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de changer l'état.");
      } finally {
        setIsMutatingId(null);
      }
    },
    [duplicatesQuery, listingsQuery],
  );

  const openEditPanel = useCallback(async (listingId: string) => {
    setGlobalError(null);
    setGlobalMessage(null);
    setIsLoadingDetails(true);
    try {
      const payload = await fetchJson<ListingDetailsPayload>(
        `/api/admin/v1/listings/${listingId}`,
        "Impossible de charger le détail de l'annonce.",
      );
      setEditForm(toEditFormState(payload.listing));
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Impossible de charger l'annonce.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const closeEditPanel = useCallback(() => {
    setEditForm(null);
  }, []);

  const onSubmitEdit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editForm) {
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsMutatingId(editForm.id);

      try {
        const payload = {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          typeProperty: editForm.typeProperty.trim(),
          status: editForm.status,
          price: Number(editForm.price),
          area: Number(editForm.area),
          street: editForm.street.trim(),
          city: editForm.city.trim(),
          province: editForm.province.trim(),
          country: editForm.country.trim(),
          countryCode: editForm.countryCode.trim(),
          contact: editForm.contact.trim(),
          tags: splitTags(editForm.tagsRaw),
        };

        const response = await fetch(`/api/admin/v1/listings/${editForm.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !result.success) {
          throw new Error(result.success ? "Impossible de modifier l'annonce." : result.error?.message);
        }

        setEditForm(null);
        await Promise.all([listingsQuery.refetch(), duplicatesQuery.refetch()]);
        setGlobalMessage("Annonce mise à jour avec succès.");
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de modifier l'annonce.");
      } finally {
        setIsMutatingId(null);
      }
    },
    [duplicatesQuery, editForm, listingsQuery],
  );

  const toggleSelectAllVisible = useCallback(() => {
    if (!canUseBulkActions || visibleListingIds.length === 0) {
      return;
    }

    setSelectedListingIds((previous) => {
      if (allVisibleSelected) {
        return previous.filter((id) => !visibleListingIds.includes(id));
      }

      const merged = new Set(previous);
      visibleListingIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }, [allVisibleSelected, canUseBulkActions, visibleListingIds]);

  const toggleSelectListing = useCallback(
    (listingId: string) => {
      if (!canUseBulkActions) {
        return;
      }

      setSelectedListingIds((previous) => {
        if (previous.includes(listingId)) {
          return previous.filter((id) => id !== listingId);
        }
        return [...previous, listingId];
      });
    },
    [canUseBulkActions],
  );

  const changeListingsStateBulk = useCallback(
    async (nextState: "IN_PROGRESS" | "ARCHIVED") => {
      if (!selectedListingIds.length) {
        setGlobalError("Sélectionne au moins une annonce.");
        return;
      }

      setGlobalError(null);
      setGlobalMessage(null);
      setIsBulkMutating(true);

      try {
        const response = await fetch("/api/admin/v1/listings/bulk/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            propertyIds: selectedListingIds,
            state: nextState,
          }),
        });

        const payload = (await response.json()) as
          | {
              success: true;
              data: {
                requestedCount: number;
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

        const summary = payload.data;
        setGlobalMessage(
          `Action bulk terminée: ${summary.updatedCount} mises à jour, ${summary.notFoundCount} introuvables, ${summary.failedCount} en échec.`,
        );
        setSelectedListingIds([]);
        await Promise.all([listingsQuery.refetch(), duplicatesQuery.refetch()]);
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible d'appliquer l'action en masse.");
      } finally {
        setIsBulkMutating(false);
      }
    },
    [duplicatesQuery, listingsQuery, selectedListingIds],
  );

  const hasError = listingsQuery.isError || duplicatesQuery.isError || permissionsQuery.isError;
  const topDuplicateGroups = duplicatesQuery.data?.groups.slice(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des annonces"
        description="Lister, filtrer, rechercher, modifier, changer l'état et détecter les doublons."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign("/dashboard/listings/duplicates")}
            >
              Module doublons
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={!canExportListings}
            >
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
          <h2 className="text-base font-semibold text-slate-900">Filtres</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" onSubmit={onApplyFilters}>
            <Input
              placeholder="Recherche (titre, ville, id, tags...)"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
            />
            <Input
              placeholder="UID annonceur (createdBy)"
              value={createdByDraft}
              onChange={(event) => setCreatedByDraft(event.target.value)}
            />
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={status}
              onChange={(event) => setStatus(event.target.value as ListingStatusFilter)}
            >
              <option value="all">Tous les statuts (location/vente)</option>
              <option value="FOR_RENT">À louer</option>
              <option value="FOR_SALE">À vendre</option>
            </select>
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={state}
              onChange={(event) => setState(event.target.value as ListingStateFilter)}
            >
              <option value="all">Tous les états</option>
              <option value="IN_PROGRESS">Actif</option>
              <option value="ARCHIVED">Archivé</option>
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

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Résultats page</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(listingsQuery.data?.count ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Actives</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(listingsQuery.data?.summary.inProgressCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Archivées</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(listingsQuery.data?.summary.archivedCount ?? 0)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Groupes doublons</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatNumber(duplicatesQuery.data?.returned ?? 0)}
            </p>
          </CardHeader>
        </Card>
      </section>

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

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Annonces</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-700">
              Sélection actuelle: <span className="font-semibold">{formatNumber(selectedListingIds.length)}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkArchive || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => void changeListingsStateBulk("ARCHIVED")}
              >
                Archiver la sélection
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canBulkRestore || selectedListingIds.length === 0 || isBulkMutating}
                onClick={() => void changeListingsStateBulk("IN_PROGRESS")}
              >
                Restaurer la sélection
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={!canUseBulkActions || visibleListingIds.length === 0}
                    />
                  </th>
                  <th className="py-2 pr-4 font-medium">Annonce</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Prix</th>
                  <th className="py-2 pr-4 font-medium">Localisation</th>
                  <th className="py-2 pr-4 font-medium">Annonceur</th>
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
                      className={`border-b border-slate-100 align-top ${
                        selectedIdsSet.has(listing.id) ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="py-2 pr-4">
                        <input
                          type="checkbox"
                          checked={selectedIdsSet.has(listing.id)}
                          onChange={() => toggleSelectListing(listing.id)}
                          disabled={!canUseBulkActions}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <p className="font-medium text-slate-900">{listing.title}</p>
                        <p className="max-w-[260px] truncate text-xs text-slate-500">{listing.id}</p>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        <p>{listing.typeProperty ?? "N/A"}</p>
                        <p className="text-xs text-slate-500">{statusLabel(listing.status)}</p>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        <p>{formatMoney(listing.price)}</p>
                        <p className="text-xs text-slate-500">{formatNumber(listing.area)} m²</p>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {(listing.city ?? "N/A") + ", " + (listing.province ?? "N/A")}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{listing.createdBy ?? "N/A"}</td>
                      <td className="py-2 pr-4 text-slate-700">{stateLabel(listing.state)}</td>
                      <td className="py-2 pr-4 text-slate-700">{toDateLabel(listing.createdAt)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canEditListing || isMutatingId === listing.id || isLoadingDetails}
                            onClick={() => void openEditPanel(listing.id)}
                          >
                            Modifier
                          </Button>
                          {listing.state === "ARCHIVED" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={!canRestoreListing || isMutatingId === listing.id}
                              onClick={() => void changeListingState(listing, "IN_PROGRESS")}
                            >
                              Restaurer
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!canArchiveListing || isMutatingId === listing.id}
                              onClick={() => void changeListingState(listing, "ARCHIVED")}
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
                    <td colSpan={9} className="py-6 text-center text-sm text-slate-500">
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

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Doublons potentiels</h2>
          <p className="text-sm text-slate-600">
            Analyse sur {formatNumber(duplicatesQuery.data?.scanned ?? 0)} annonces récentes.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {topDuplicateGroups.length ? (
            topDuplicateGroups.map((group) => (
              <div key={group.clusterId} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {group.reason === "same_signature" ? "Signature quasi identique" : "Même image principale"}
                  </p>
                  <p className="text-xs text-slate-500">
                    confiance {group.confidence}% - {group.listings.length} annonces
                  </p>
                </div>
                {group.resolution ? (
                  <p className="mb-2 text-xs text-emerald-700">
                    Déjà traité: {group.resolution.action} ({toDateLabel(group.resolution.reviewedAt)})
                  </p>
                ) : null}
                <div className="space-y-2">
                  {group.listings.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"
                    >
                      <p className="font-medium text-slate-800">
                        {item.title} ({item.id})
                      </p>
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>{statusLabel(item.status)}</span>
                        <span>{formatMoney(item.price)}</span>
                        <span>{stateLabel(item.state)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Aucun doublon détecté sur l&apos;échantillon actuel.</p>
          )}
        </CardContent>
      </Card>

      {editForm ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Modifier l&apos;annonce</h2>
            <p className="text-sm text-slate-600">Annonce: {editForm.id}</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmitEdit}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={editForm.title}
                  onChange={(event) => setEditForm((previous) => (previous ? { ...previous, title: event.target.value } : previous))}
                  placeholder="Titre"
                />
                <Input
                  value={editForm.typeProperty}
                  onChange={(event) =>
                    setEditForm((previous) => (previous ? { ...previous, typeProperty: event.target.value } : previous))
                  }
                  placeholder="TypeProperty"
                />
              </div>
              <textarea
                className="min-h-[110px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((previous) => (previous ? { ...previous, description: event.target.value } : previous))
                }
                placeholder="Description"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((previous) =>
                      previous ? { ...previous, status: event.target.value as "FOR_RENT" | "FOR_SALE" } : previous,
                    )
                  }
                >
                  <option value="FOR_RENT">À louer</option>
                  <option value="FOR_SALE">À vendre</option>
                </select>
                <Input
                  type="number"
                  value={editForm.price}
                  onChange={(event) => setEditForm((previous) => (previous ? { ...previous, price: event.target.value } : previous))}
                  placeholder="Prix"
                />
                <Input
                  type="number"
                  value={editForm.area}
                  onChange={(event) => setEditForm((previous) => (previous ? { ...previous, area: event.target.value } : previous))}
                  placeholder="Surface"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={editForm.street}
                  onChange={(event) => setEditForm((previous) => (previous ? { ...previous, street: event.target.value } : previous))}
                  placeholder="Rue"
                />
                <Input
                  value={editForm.city}
                  onChange={(event) => setEditForm((previous) => (previous ? { ...previous, city: event.target.value } : previous))}
                  placeholder="Ville"
                />
                <Input
                  value={editForm.province}
                  onChange={(event) =>
                    setEditForm((previous) => (previous ? { ...previous, province: event.target.value } : previous))
                  }
                  placeholder="Province"
                />
                <Input
                  value={editForm.country}
                  onChange={(event) =>
                    setEditForm((previous) => (previous ? { ...previous, country: event.target.value } : previous))
                  }
                  placeholder="Pays"
                />
                <Input
                  value={editForm.countryCode}
                  onChange={(event) =>
                    setEditForm((previous) => (previous ? { ...previous, countryCode: event.target.value } : previous))
                  }
                  placeholder="Code pays"
                />
                <Input
                  value={editForm.contact}
                  onChange={(event) =>
                    setEditForm((previous) => (previous ? { ...previous, contact: event.target.value } : previous))
                  }
                  placeholder="Contact"
                />
              </div>
              <Input
                value={editForm.tagsRaw}
                onChange={(event) =>
                  setEditForm((previous) => (previous ? { ...previous, tagsRaw: event.target.value } : previous))
                }
                placeholder="Tags séparés par virgules"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isMutatingId === editForm.id}>
                  Enregistrer
                </Button>
                <Button type="button" variant="outline" onClick={closeEditPanel}>
                  Fermer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
