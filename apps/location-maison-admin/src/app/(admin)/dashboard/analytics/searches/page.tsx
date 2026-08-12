"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCcw, Search } from "lucide-react";

import { Badge } from "@trouve-ton-nkama/ui/badge";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type RangeFilter = "24h" | "7d" | "30d" | "custom";
type SourceFilter = "all" | "catalog_search_page" | "location_maison_search_bar" | "search_with_ia_page" | "property_location_form";
type ResultFilter = "all" | "with_results" | "without_results" | "pending";

type SearchAnalyticsPayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  filters: {
    source: SourceFilter;
    resultFilter: ResultFilter;
    queryText: string;
  };
  summary: {
    totalSearches: number;
    withResults: number;
    withoutResults: number;
    pendingResults: number;
    successRate: number;
  };
  sources: Array<{
    source: SourceFilter | string;
    searches: number;
  }>;
  topQueries: Array<{
    queryText: string;
    searches: number;
    withResults: number;
    withoutResults: number;
    pendingResults: number;
  }>;
  searches: Array<{
    searchId: string;
    occurredAt: string;
    source: SourceFilter | string;
    queryTextRaw: string | null;
    queryTextNormalized: string | null;
    filters: Record<string, unknown> | null;
    resultsCount: number | null;
    hasResults: boolean | null;
    resultStatus: ResultFilter;
    executionMs: number | null;
    actorId: string | null;
    isAuthenticated: boolean | null;
    sessionId: string | null;
  }>;
  page: {
    limit: number;
    offset: number;
    returned: number;
    totalCount: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

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

function toSourceLabel(source: SourceFilter | string) {
  if (source === "catalog_search_page") {
    return "Catalogue";
  }
  if (source === "location_maison_search_bar") {
    return "Barre de recherche";
  }
  if (source === "search_with_ia_page") {
    return "Recherche IA";
  }
  if (source === "property_location_form") {
    return "Localisation d'annonce";
  }
  return source;
}

function statusBadge(resultStatus: ResultFilter) {
  if (resultStatus === "with_results") {
    return <Badge variant="success">Avec résultats</Badge>;
  }
  if (resultStatus === "without_results") {
    return <Badge variant="warning">Sans résultat</Badge>;
  }
  return <Badge variant="secondary">En attente</Badge>;
}

function formatFilters(filters: Record<string, unknown> | null) {
  if (!filters) {
    return "Aucun filtre";
  }

  const entries = Object.entries(filters).slice(0, 3);
  if (entries.length === 0) {
    return "Aucun filtre";
  }

  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: ${value.join(", ")}`;
      }
      if (value && typeof value === "object") {
        return `${key}: [objet]`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(" | ");
}

async function fetchSearchAnalytics(params: {
  range: RangeFilter;
  start?: string;
  end?: string;
  source: SourceFilter;
  resultFilter: ResultFilter;
  query: string;
  limit: number;
  offset: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("range", params.range);
  searchParams.set("source", params.source);
  searchParams.set("resultFilter", params.resultFilter);
  searchParams.set("limit", String(params.limit));
  searchParams.set("offset", String(params.offset));

  const query = params.query.trim();
  if (query) {
    searchParams.set("query", query);
  }

  if (params.range === "custom") {
    if (params.start) searchParams.set("start", params.start);
    if (params.end) searchParams.set("end", params.end);
  }

  const response = await fetch(`/api/admin/v1/analytics/searches?${searchParams.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: SearchAnalyticsPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les recherches analytics." : payload.error?.message);
  }

  return payload.data;
}

export default function AnalyticsSearchesPage() {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [source, setSource] = useState<SourceFilter>("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const queryEnabled = useMemo(() => {
    if (range !== "custom") {
      return true;
    }

    return customStart.trim().length > 0 && customEnd.trim().length > 0;
  }, [customEnd, customStart, range]);

  const analyticsQuery = useQuery({
    queryKey: [
      "analytics",
      "searches",
      range,
      source,
      resultFilter,
      queryApplied,
      customStart,
      customEnd,
      offset,
      limit,
    ],
    queryFn: () =>
      fetchSearchAnalytics({
        range,
        start: range === "custom" ? customStart : undefined,
        end: range === "custom" ? customEnd : undefined,
        source,
        resultFilter,
        query: queryApplied,
        limit,
        offset,
      }),
    enabled: queryEnabled,
  });

  const data = analyticsQuery.data;
  const loading = analyticsQuery.isLoading;
  const error = analyticsQuery.error?.message ?? null;
  const searches = data?.searches ?? [];
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("source", source);
    params.set("resultFilter", resultFilter);
    params.set("maxRows", "50000");

    if (queryApplied.trim()) {
      params.set("query", queryApplied.trim());
    }

    if (range === "custom") {
      if (customStart.trim()) params.set("start", customStart.trim());
      if (customEnd.trim()) params.set("end", customEnd.trim());
    }

    return `/api/admin/v1/analytics/searches/export?${params.toString()}`;
  }, [customEnd, customStart, queryApplied, range, resultFilter, source]);

  const onApplyFilters = useCallback(() => {
    setQueryApplied(queryDraft.trim());
    setOffset(0);
  }, [queryDraft]);

  const onResetFilters = useCallback(() => {
    setRange("7d");
    setSource("all");
    setResultFilter("all");
    setQueryDraft("");
    setQueryApplied("");
    setCustomStart("");
    setCustomEnd("");
    setOffset(0);
  }, []);

  const onPreviousPage = useCallback(() => {
    setOffset((current) => Math.max(0, current - limit));
  }, [limit]);

  const onNextPage = useCallback(() => {
    if (!data?.page.hasMore) {
      return;
    }
    setOffset((current) => current + limit);
  }, [data?.page.hasMore, limit]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics recherches"
        description="Vision consolidée des recherches utilisateurs et de leur taux de résultat."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void analyticsQuery.refetch()}
              disabled={loading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(exportUrl, "_blank", "noopener,noreferrer")}
              disabled={!queryEnabled}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Total recherches</p>
            <p className="text-2xl font-semibold text-slate-900">{data?.summary.totalSearches ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Avec résultats</p>
            <p className="text-2xl font-semibold text-emerald-700">{data?.summary.withResults ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Sans résultat</p>
            <p className="text-2xl font-semibold text-amber-700">{data?.summary.withoutResults ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">En attente</p>
            <p className="text-2xl font-semibold text-slate-900">{data?.summary.pendingResults ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Taux de succès</p>
            <p className="text-2xl font-semibold text-primary">{data?.summary.successRate ?? 0}%</p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Filtres</h2>
          <p className="text-sm text-slate-600">Par défaut, les données affichent les 7 derniers jours.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-5">
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={range}
              onChange={(event) => {
                setRange(event.target.value as RangeFilter);
                setOffset(0);
              }}
            >
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="custom">Période personnalisée</option>
            </select>

            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as SourceFilter);
                setOffset(0);
              }}
            >
              <option value="all">Toutes les sources</option>
              <option value="catalog_search_page">Catalogue</option>
              <option value="location_maison_search_bar">Barre de recherche</option>
              <option value="search_with_ia_page">Recherche IA</option>
              <option value="property_location_form">Localisation d&apos;annonce</option>
            </select>

            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={resultFilter}
              onChange={(event) => {
                setResultFilter(event.target.value as ResultFilter);
                setOffset(0);
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="with_results">Avec résultats</option>
              <option value="without_results">Sans résultat</option>
              <option value="pending">En attente de résultat</option>
            </select>

            <Input
              placeholder="Requête (ex: maison essassa)"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onApplyFilters();
                }
              }}
            />

            <div className="flex items-center gap-2">
              <Button type="button" onClick={onApplyFilters}>
                <Search className="mr-2 h-4 w-4" />
                Appliquer
              </Button>
              <Button type="button" variant="outline" onClick={onResetFilters}>
                Réinitialiser
              </Button>
            </div>
          </div>

          {range === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(event) => {
                  setCustomStart(event.target.value);
                  setOffset(0);
                }}
              />
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(event) => {
                  setCustomEnd(event.target.value);
                  setOffset(0);
                }}
              />
            </div>
          ) : null}

          <p className="text-xs text-slate-500">
            Fenêtre active: {toDateLabel(data?.period.startAt)} - {toDateLabel(data?.period.endAt)}
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Recherches récentes</h2>
            <p className="text-sm text-slate-600">
              {data?.page.totalCount ?? 0} recherche(s) - page {Math.floor((data?.page.offset ?? 0) / limit) + 1}
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Source</th>
                        <th className="py-2 pr-4 font-medium">Requête</th>
                        <th className="py-2 pr-4 font-medium">Résultats</th>
                        <th className="py-2 pr-4 font-medium">Statut</th>
                        <th className="py-2 pr-4 font-medium">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                            Aucune recherche trouvée avec ces filtres.
                          </td>
                        </tr>
                      ) : (
                        searches.map((item) => (
                          <tr key={item.searchId} className="border-b border-slate-100 align-top">
                            <td className="py-3 pr-4 text-slate-700">{toDateLabel(item.occurredAt)}</td>
                            <td className="py-3 pr-4 text-slate-700">{toSourceLabel(item.source)}</td>
                            <td className="py-3 pr-4">
                              <p className="font-medium text-slate-900">
                                {item.queryTextRaw || item.queryTextNormalized || "(vide)"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{formatFilters(item.filters)}</p>
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {item.resultsCount === null ? "N/A" : item.resultsCount}
                            </td>
                            <td className="py-3 pr-4">{statusBadge(item.resultStatus)}</td>
                            <td className="py-3 pr-4 text-xs text-slate-600">
                              <p>{item.actorId || "Visiteur"}</p>
                              <p>{item.isAuthenticated === true ? "Authentifié" : "Anonyme"}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPreviousPage}
                    disabled={(data?.page.offset ?? 0) === 0}
                  >
                    Précédent
                  </Button>
                  <Button type="button" variant="outline" onClick={onNextPage} disabled={!data?.page.hasMore}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Top requêtes</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : data?.topQueries.length ? (
              data.topQueries.slice(0, 10).map((item) => (
                <div
                  key={item.queryText}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">{item.queryText}</p>
                  <p className="text-xs text-slate-600">
                    {item.searches} recherche(s) | {item.withResults} avec résultat
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Aucune requête sur cette période.</p>
            )}

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-900">Répartition par source</h3>
              <div className="mt-2 space-y-1">
                {data?.sources.map((item) => (
                  <p key={item.source} className="text-xs text-slate-600">
                    {toSourceLabel(item.source)}: {item.searches}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
