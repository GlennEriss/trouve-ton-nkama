"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type GabonOsmProvinceOption = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

type GabonOsmCityOption = {
  id: string;
  name: string;
  province: string | null;
  lat: number;
  lon: number;
};

type GabonOsmQuarterOption = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  lat: number;
  lon: number;
};

type GabonOsmSelectorPayload = {
  country: {
    name: string;
    iso2: string;
  };
  sourceMode: "cloud" | "local";
  sourcePath: string;
  sourceBucket: string | null;
  sourceObjectPath: string | null;
  sourceUpdatedAt: string | null;
  provinces: GabonOsmProvinceOption[];
  cities: GabonOsmCityOption[];
  quarters: GabonOsmQuarterOption[];
};

type SyncProjectionPayload = {
  counts: {
    provinces: number;
    cities: number;
    quarters: number;
  };
  sourceMode: "cloud" | "local";
  sourceUpdatedAt: string | null;
  syncedAt: string;
};

type ActiveDataset = "provinces" | "cities" | "quarters";

type DeleteDialogState =
  | {
      kind: "city";
      city: GabonOsmCityOption;
    }
  | {
      kind: "quarter";
      quarter: GabonOsmQuarterOption;
    };

type EditDialogState =
  | {
      kind: "city";
      cityId: string;
      name: string;
      province: string;
      lat: string;
      lon: string;
    }
  | {
      kind: "quarter";
      quarterId: string;
      name: string;
      cityId: string;
      lat: string;
      lon: string;
    };

type CityMutationPayload = {
  city: GabonOsmCityOption;
  deletedQuarters?: number;
};

type QuarterMutationPayload = {
  quarter: GabonOsmQuarterOption;
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

function toCoordLabel(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  return value.toFixed(6);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseFiniteNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function GeolocationDashboardPage() {
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeDataset, setActiveDataset] = useState<ActiveDataset>("provinces");
  const [searchText, setSearchText] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const [createCityName, setCreateCityName] = useState("");
  const [createCityProvince, setCreateCityProvince] = useState("");
  const [createCityLat, setCreateCityLat] = useState("");
  const [createCityLon, setCreateCityLon] = useState("");

  const [createQuarterName, setCreateQuarterName] = useState("");
  const [createQuarterCityId, setCreateQuarterCityId] = useState("");
  const [createQuarterLat, setCreateQuarterLat] = useState("");
  const [createQuarterLon, setCreateQuarterLon] = useState("");

  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = useMemo(() => permissionsQuery.data?.admin.permissions ?? [], [permissionsQuery.data?.admin.permissions]);
  const canReadGeolocation = useMemo(() => hasPermission(permissions, "listings.read"), [permissions]);
  const canManageGeolocation = useMemo(() => hasPermission(permissions, "listings.update"), [permissions]);

  const osmQuery = useQuery({
    queryKey: ["dashboard", "geolocation", "gabon-osm"],
    queryFn: () =>
      fetchJson<GabonOsmSelectorPayload>("/api/admin/v1/osm/gabon", "Impossible de charger les données OSM."),
    enabled: canReadGeolocation,
  });

  const selectedQuarterCity = useMemo(() => {
    if (!createQuarterCityId) return null;
    return (osmQuery.data?.cities ?? []).find((city) => city.id === createQuarterCityId) ?? null;
  }, [createQuarterCityId, osmQuery.data?.cities]);

  const editQuarterCity = useMemo(() => {
    if (!editDialog || editDialog.kind !== "quarter") return null;
    return (osmQuery.data?.cities ?? []).find((city) => city.id === editDialog.cityId) ?? null;
  }, [editDialog, osmQuery.data?.cities]);

  const filteredProvinces = useMemo(() => {
    const query = normalizeSearch(searchText);
    if (!query) return osmQuery.data?.provinces ?? [];
    return (osmQuery.data?.provinces ?? []).filter((province) => normalizeSearch(province.name).includes(query));
  }, [osmQuery.data?.provinces, searchText]);

  const filteredCities = useMemo(() => {
    const query = normalizeSearch(searchText);
    if (!query) return osmQuery.data?.cities ?? [];
    return (osmQuery.data?.cities ?? []).filter((city) => {
      return normalizeSearch(city.name).includes(query) || normalizeSearch(city.province ?? "").includes(query);
    });
  }, [osmQuery.data?.cities, searchText]);

  const filteredQuarters = useMemo(() => {
    const query = normalizeSearch(searchText);
    if (!query) return osmQuery.data?.quarters ?? [];
    return (osmQuery.data?.quarters ?? []).filter((quarter) => {
      return (
        normalizeSearch(quarter.name).includes(query) ||
        normalizeSearch(quarter.city ?? "").includes(query) ||
        normalizeSearch(quarter.province ?? "").includes(query)
      );
    });
  }, [osmQuery.data?.quarters, searchText]);

  const countByDataset = useMemo(
    () => ({
      provinces: filteredProvinces.length,
      cities: filteredCities.length,
      quarters: filteredQuarters.length,
    }),
    [filteredCities.length, filteredProvinces.length, filteredQuarters.length],
  );

  const resetCreateCityForm = useCallback(() => {
    setCreateCityName("");
    setCreateCityProvince("");
    setCreateCityLat("");
    setCreateCityLon("");
  }, []);

  const resetCreateQuarterForm = useCallback(() => {
    setCreateQuarterName("");
    setCreateQuarterCityId("");
    setCreateQuarterLat("");
    setCreateQuarterLon("");
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([permissionsQuery.refetch(), osmQuery.refetch()]);
  }, [osmQuery, permissionsQuery]);

  const handleRefresh = useCallback(async () => {
    setGlobalMessage(null);
    setGlobalError(null);
    await refreshAll();
  }, [refreshAll]);

  const handleSyncProjection = useCallback(async () => {
    if (!canManageGeolocation) {
      return;
    }

    setGlobalMessage(null);
    setGlobalError(null);
    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/v1/osm/gabon/sync", { method: "POST" });
      const payload = (await response.json()) as
        | { success: true; data: SyncProjectionPayload }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Impossible de synchroniser la projection OSM." : payload.error?.message);
      }

      setGlobalMessage(
        `Projection OSM synchronisée (${payload.data.counts.provinces} provinces, ${payload.data.counts.cities} villes, ${payload.data.counts.quarters} quartiers).`,
      );
      await osmQuery.refetch();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Impossible de synchroniser la projection OSM.");
    } finally {
      setIsSyncing(false);
    }
  }, [canManageGeolocation, osmQuery]);

  const handleCreateCity = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageGeolocation) {
        return;
      }

      const lat = parseFiniteNumber(createCityLat);
      const lon = parseFiniteNumber(createCityLon);
      if (lat == null || lon == null) {
        setGlobalError("Latitude/longitude ville invalides.");
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsMutating(true);
      try {
        const response = await fetch("/api/admin/v1/osm/gabon/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: createCityName,
            province: createCityProvince,
            lat,
            lon,
          }),
        });
        const payload = (await response.json()) as
          | { success: true; data: CityMutationPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer cette ville." : payload.error?.message);
        }

        setGlobalMessage(`Ville ajoutée: ${payload.data.city.name}.`);
        resetCreateCityForm();
        await osmQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer cette ville.");
      } finally {
        setIsMutating(false);
      }
    },
    [canManageGeolocation, createCityLat, createCityLon, createCityName, createCityProvince, osmQuery, resetCreateCityForm],
  );

  const handleCreateQuarter = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageGeolocation) {
        return;
      }
      if (!selectedQuarterCity) {
        setGlobalError("Sélectionne une ville pour le quartier.");
        return;
      }

      const lat = parseFiniteNumber(createQuarterLat);
      const lon = parseFiniteNumber(createQuarterLon);
      if (lat == null || lon == null) {
        setGlobalError("Latitude/longitude quartier invalides.");
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsMutating(true);
      try {
        const response = await fetch("/api/admin/v1/osm/gabon/quarters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: createQuarterName,
            city: selectedQuarterCity.name,
            province: selectedQuarterCity.province ?? "",
            lat,
            lon,
          }),
        });
        const payload = (await response.json()) as
          | { success: true; data: QuarterMutationPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer ce quartier." : payload.error?.message);
        }

        setGlobalMessage(`Quartier ajouté: ${payload.data.quarter.name}.`);
        resetCreateQuarterForm();
        await osmQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer ce quartier.");
      } finally {
        setIsMutating(false);
      }
    },
    [canManageGeolocation, createQuarterLat, createQuarterLon, createQuarterName, osmQuery, resetCreateQuarterForm, selectedQuarterCity],
  );

  const openCityEditDialog = useCallback((city: GabonOsmCityOption) => {
    setEditDialog({
      kind: "city",
      cityId: city.id,
      name: city.name,
      province: city.province ?? "",
      lat: String(city.lat),
      lon: String(city.lon),
    });
  }, []);

  const openQuarterEditDialog = useCallback(
    (quarter: GabonOsmQuarterOption) => {
      const matchedCity =
        (osmQuery.data?.cities ?? []).find(
          (city) =>
            city.name === (quarter.city ?? "") &&
            (city.province ?? "") === (quarter.province ?? ""),
        ) ??
        (osmQuery.data?.cities ?? [])[0] ??
        null;

      setEditDialog({
        kind: "quarter",
        quarterId: quarter.id,
        name: quarter.name,
        cityId: matchedCity?.id ?? "",
        lat: String(quarter.lat),
        lon: String(quarter.lon),
      });
    },
    [osmQuery.data?.cities],
  );

  const closeEditDialog = useCallback(() => {
    if (isMutating) return;
    setEditDialog(null);
  }, [isMutating]);

  const handleEditSubmit = useCallback(async () => {
    if (!editDialog || !canManageGeolocation) return;

    setGlobalMessage(null);
    setGlobalError(null);
    setIsMutating(true);
    try {
      if (editDialog.kind === "city") {
        const lat = parseFiniteNumber(editDialog.lat);
        const lon = parseFiniteNumber(editDialog.lon);
        if (lat == null || lon == null) {
          throw new Error("Latitude/longitude ville invalides.");
        }

        const response = await fetch(`/api/admin/v1/osm/gabon/cities/${encodeURIComponent(editDialog.cityId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editDialog.name,
            province: editDialog.province,
            lat,
            lon,
          }),
        });
        const payload = (await response.json()) as
          | { success: true; data: CityMutationPayload }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de modifier cette ville." : payload.error?.message);
        }

        setGlobalMessage(`Ville modifiée: ${payload.data.city.name}.`);
      } else {
        const lat = parseFiniteNumber(editDialog.lat);
        const lon = parseFiniteNumber(editDialog.lon);
        if (lat == null || lon == null) {
          throw new Error("Latitude/longitude quartier invalides.");
        }
        const selectedCity = (osmQuery.data?.cities ?? []).find((city) => city.id === editDialog.cityId);
        if (!selectedCity) {
          throw new Error("Ville du quartier introuvable.");
        }

        const response = await fetch(`/api/admin/v1/osm/gabon/quarters/${encodeURIComponent(editDialog.quarterId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editDialog.name,
            city: selectedCity.name,
            province: selectedCity.province ?? "",
            lat,
            lon,
          }),
        });
        const payload = (await response.json()) as
          | { success: true; data: QuarterMutationPayload }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de modifier ce quartier." : payload.error?.message);
        }

        setGlobalMessage(`Quartier modifié: ${payload.data.quarter.name}.`);
      }

      setEditDialog(null);
      await osmQuery.refetch();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Impossible de modifier cet élément.");
    } finally {
      setIsMutating(false);
    }
  }, [canManageGeolocation, editDialog, osmQuery]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog || !canManageGeolocation) return;

    setGlobalMessage(null);
    setGlobalError(null);
    setIsMutating(true);
    try {
      if (deleteDialog.kind === "city") {
        const response = await fetch(`/api/admin/v1/osm/gabon/cities/${encodeURIComponent(deleteDialog.city.id)}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as
          | { success: true; data: CityMutationPayload }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de supprimer cette ville." : payload.error?.message);
        }
        const deletedQuarters = payload.data.deletedQuarters ?? 0;
        setGlobalMessage(
          `Ville supprimée: ${payload.data.city.name}.${deletedQuarters > 0 ? ` Quartiers supprimés: ${deletedQuarters}.` : ""}`,
        );
      } else {
        const response = await fetch(`/api/admin/v1/osm/gabon/quarters/${encodeURIComponent(deleteDialog.quarter.id)}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as
          | { success: true; data: QuarterMutationPayload }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de supprimer ce quartier." : payload.error?.message);
        }
        setGlobalMessage(`Quartier supprimé: ${payload.data.quarter.name}.`);
      }

      setDeleteDialog(null);
      await osmQuery.refetch();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Impossible de supprimer cet élément.");
    } finally {
      setIsMutating(false);
    }
  }, [canManageGeolocation, deleteDialog, osmQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Géolocalisation"
        description="Référentiel OSM partagé: provinces, villes, quartiers et coordonnées (lat/lon)."
        actions={
          <>
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={permissionsQuery.isFetching || osmQuery.isFetching}>
              Actualiser
            </Button>
            <Button onClick={() => void handleSyncProjection()} disabled={!canManageGeolocation || isSyncing}>
              {isSyncing ? "Synchronisation..." : "Synchroniser projection"}
            </Button>
          </>
        }
      />

      {globalError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{globalError}</p> : null}
      {globalMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{globalMessage}</p>
      ) : null}

      {!canReadGeolocation ? (
        <Card>
          <CardContent className="py-6 text-sm text-slate-600">
            Permission insuffisante: <code>listings.read</code> requise pour consulter la géolocalisation.
          </CardContent>
        </Card>
      ) : null}

      {canReadGeolocation ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 text-sm text-slate-500">Source OSM</CardHeader>
              <CardContent className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Badge variant={osmQuery.data?.sourceMode === "cloud" ? "success" : "warning"}>
                  {osmQuery.data?.sourceMode === "cloud" ? "Cloud Storage" : "Local"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 text-sm text-slate-500">Provinces</CardHeader>
              <CardContent className="text-2xl font-semibold text-slate-900">{osmQuery.data?.provinces.length ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 text-sm text-slate-500">Villes</CardHeader>
              <CardContent className="text-2xl font-semibold text-slate-900">{osmQuery.data?.cities.length ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 text-sm text-slate-500">Quartiers</CardHeader>
              <CardContent className="text-2xl font-semibold text-slate-900">{osmQuery.data?.quarters.length ?? 0}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-2 text-sm font-medium text-slate-700">Ajouter une ville dans une province</CardHeader>
              <CardContent>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleCreateCity(event)}>
                  <Input
                    value={createCityName}
                    onChange={(event) => setCreateCityName(event.target.value)}
                    placeholder="Nom de la ville"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    value={createCityProvince}
                    onChange={(event) => setCreateCityProvince(event.target.value)}
                    disabled={!canManageGeolocation || isMutating}
                  >
                    <option value="">Sélectionner une province</option>
                    {(osmQuery.data?.provinces ?? []).map((province) => (
                      <option key={province.id} value={province.name}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="any"
                    value={createCityLat}
                    onChange={(event) => setCreateCityLat(event.target.value)}
                    placeholder="Latitude"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <Input
                    type="number"
                    step="any"
                    value={createCityLon}
                    onChange={(event) => setCreateCityLon(event.target.value)}
                    placeholder="Longitude"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={!canManageGeolocation || isMutating}>
                      Ajouter la ville
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 text-sm font-medium text-slate-700">Ajouter un quartier dans une ville</CardHeader>
              <CardContent>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => void handleCreateQuarter(event)}>
                  <Input
                    value={createQuarterName}
                    onChange={(event) => setCreateQuarterName(event.target.value)}
                    placeholder="Nom du quartier"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <select
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    value={createQuarterCityId}
                    onChange={(event) => setCreateQuarterCityId(event.target.value)}
                    disabled={!canManageGeolocation || isMutating}
                  >
                    <option value="">Sélectionner une ville</option>
                    {(osmQuery.data?.cities ?? []).map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                        {city.province ? ` · ${city.province}` : ""}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={selectedQuarterCity?.province ?? ""}
                    placeholder="Province (auto)"
                    disabled
                    readOnly
                  />
                  <div />
                  <Input
                    type="number"
                    step="any"
                    value={createQuarterLat}
                    onChange={(event) => setCreateQuarterLat(event.target.value)}
                    placeholder="Latitude"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <Input
                    type="number"
                    step="any"
                    value={createQuarterLon}
                    onChange={(event) => setCreateQuarterLon(event.target.value)}
                    placeholder="Longitude"
                    disabled={!canManageGeolocation || isMutating}
                  />
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={!canManageGeolocation || isMutating}>
                      Ajouter le quartier
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>
                  Pays: <strong>{osmQuery.data?.country.name ?? "N/A"}</strong> ({osmQuery.data?.country.iso2 ?? "N/A"})
                </span>
                <span>•</span>
                <span>
                  Source: <code className="rounded bg-slate-100 px-1 py-0.5">{osmQuery.data?.sourcePath ?? "N/A"}</code>
                </span>
                <span>•</span>
                <span>Mis à jour: {toDateLabel(osmQuery.data?.sourceUpdatedAt)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Rechercher par nom, ville, province..."
                  className="max-w-md"
                />
                <Button
                  type="button"
                  variant={activeDataset === "provinces" ? "default" : "outline"}
                  onClick={() => setActiveDataset("provinces")}
                >
                  Provinces ({countByDataset.provinces})
                </Button>
                <Button type="button" variant={activeDataset === "cities" ? "default" : "outline"} onClick={() => setActiveDataset("cities")}>
                  Villes ({countByDataset.cities})
                </Button>
                <Button
                  type="button"
                  variant={activeDataset === "quarters" ? "default" : "outline"}
                  onClick={() => setActiveDataset("quarters")}
                >
                  Quartiers ({countByDataset.quarters})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {osmQuery.isLoading ? <p className="text-sm text-slate-500">Chargement des données OSM...</p> : null}
              {osmQuery.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {osmQuery.error instanceof Error ? osmQuery.error.message : "Erreur lors du chargement OSM."}
                </p>
              ) : null}

              {!osmQuery.isLoading && !osmQuery.isError && activeDataset === "provinces" ? (
                <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Province</th>
                        <th className="px-3 py-2 font-medium">Latitude</th>
                        <th className="px-3 py-2 font-medium">Longitude</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProvinces.map((province) => (
                        <tr key={province.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{province.name}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(province.lat)}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(province.lon)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {!osmQuery.isLoading && !osmQuery.isError && activeDataset === "cities" ? (
                <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Ville</th>
                        <th className="px-3 py-2 font-medium">Province</th>
                        <th className="px-3 py-2 font-medium">Latitude</th>
                        <th className="px-3 py-2 font-medium">Longitude</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCities.map((city) => (
                        <tr key={city.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{city.name}</td>
                          <td className="px-3 py-2 text-slate-700">{city.province ?? "N/A"}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(city.lat)}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(city.lon)}</td>
                          <td className="px-3 py-2">
                            {canManageGeolocation ? (
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={() => openCityEditDialog(city)} disabled={isMutating}>
                                  Modifier
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setDeleteDialog({ kind: "city", city })} disabled={isMutating}>
                                  Supprimer
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

              {!osmQuery.isLoading && !osmQuery.isError && activeDataset === "quarters" ? (
                <div className="max-h-[640px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">Quartier</th>
                        <th className="px-3 py-2 font-medium">Ville</th>
                        <th className="px-3 py-2 font-medium">Province</th>
                        <th className="px-3 py-2 font-medium">Latitude</th>
                        <th className="px-3 py-2 font-medium">Longitude</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuarters.map((quarter) => (
                        <tr key={quarter.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-900">{quarter.name}</td>
                          <td className="px-3 py-2 text-slate-700">{quarter.city ?? "N/A"}</td>
                          <td className="px-3 py-2 text-slate-700">{quarter.province ?? "N/A"}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(quarter.lat)}</td>
                          <td className="px-3 py-2 text-slate-700">{toCoordLabel(quarter.lon)}</td>
                          <td className="px-3 py-2">
                            {canManageGeolocation ? (
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" onClick={() => openQuarterEditDialog(quarter)} disabled={isMutating}>
                                  Modifier
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setDeleteDialog({ kind: "quarter", quarter })} disabled={isMutating}>
                                  Supprimer
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
        </>
      ) : null}

      <Dialog open={editDialog !== null} onOpenChange={(open) => (open ? undefined : closeEditDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog?.kind === "city" ? "Modifier la ville" : "Modifier le quartier"}</DialogTitle>
            <DialogDescription>
              Mets à jour les champs puis confirme pour enregistrer les changements.
            </DialogDescription>
          </DialogHeader>

          {editDialog?.kind === "city" ? (
            <div className="grid gap-3">
              <Input
                value={editDialog.name}
                onChange={(event) => setEditDialog((prev) => (prev && prev.kind === "city" ? { ...prev, name: event.target.value } : prev))}
                placeholder="Nom de la ville"
              />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                value={editDialog.province}
                onChange={(event) =>
                  setEditDialog((prev) => (prev && prev.kind === "city" ? { ...prev, province: event.target.value } : prev))
                }
              >
                <option value="">Sélectionner une province</option>
                {(osmQuery.data?.provinces ?? []).map((province) => (
                  <option key={province.id} value={province.name}>
                    {province.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="any"
                  value={editDialog.lat}
                  onChange={(event) => setEditDialog((prev) => (prev && prev.kind === "city" ? { ...prev, lat: event.target.value } : prev))}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="any"
                  value={editDialog.lon}
                  onChange={(event) => setEditDialog((prev) => (prev && prev.kind === "city" ? { ...prev, lon: event.target.value } : prev))}
                  placeholder="Longitude"
                />
              </div>
            </div>
          ) : null}

          {editDialog?.kind === "quarter" ? (
            <div className="grid gap-3">
              <Input
                value={editDialog.name}
                onChange={(event) =>
                  setEditDialog((prev) => (prev && prev.kind === "quarter" ? { ...prev, name: event.target.value } : prev))
                }
                placeholder="Nom du quartier"
              />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
                value={editDialog.cityId}
                onChange={(event) =>
                  setEditDialog((prev) => (prev && prev.kind === "quarter" ? { ...prev, cityId: event.target.value } : prev))
                }
              >
                <option value="">Sélectionner une ville</option>
                {(osmQuery.data?.cities ?? []).map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {city.province ? ` · ${city.province}` : ""}
                  </option>
                ))}
              </select>
              <Input value={editQuarterCity?.province ?? ""} placeholder="Province (auto)" readOnly disabled />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  step="any"
                  value={editDialog.lat}
                  onChange={(event) =>
                    setEditDialog((prev) => (prev && prev.kind === "quarter" ? { ...prev, lat: event.target.value } : prev))
                  }
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="any"
                  value={editDialog.lon}
                  onChange={(event) =>
                    setEditDialog((prev) => (prev && prev.kind === "quarter" ? { ...prev, lon: event.target.value } : prev))
                  }
                  placeholder="Longitude"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Annuler</Button>} />
            <Button type="button" onClick={() => void handleEditSubmit()} disabled={isMutating}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog !== null} onOpenChange={(open) => (open ? undefined : setDeleteDialog(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              {deleteDialog?.kind === "city"
                ? `Supprimer la ville "${deleteDialog.city.name}" supprimera aussi ses quartiers liés.`
                : deleteDialog?.kind === "quarter"
                  ? `Supprimer le quartier "${deleteDialog.quarter.name}" ?`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Annuler</Button>} />
            <Button type="button" onClick={() => void handleDeleteConfirm()} disabled={isMutating}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
