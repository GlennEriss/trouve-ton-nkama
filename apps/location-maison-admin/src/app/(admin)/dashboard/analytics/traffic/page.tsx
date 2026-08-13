"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Download, RefreshCcw } from "lucide-react";

import { Badge } from "@trouve-ton-nkama/ui/badge";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { RankedBarChart } from "@/components/charts/RankedBarChart";

type RangeFilter = "24h" | "7d" | "30d" | "custom";
type ProviderFilter = "all" | "firebase" | "vercel";

type TrafficPayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  filters: {
    provider: ProviderFilter;
  };
  summary: {
    totalEvents: number;
    visits: number;
    uniqueVisitors: number;
    pageViews: number;
  };
  providers: Array<{
    provider: string;
    totalEvents: number;
    visits: number;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  daily: Array<{
    dateKey: string;
    provider: string;
    visits: number;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  topPages: Array<{
    page: string;
    pageViews: number;
    visits: number;
  }>;
  events: Array<{
    occurredAt: string;
    provider: string;
    metricName: string;
    metricValue: number;
    pagePath: string | null;
    country: string | null;
    deviceCategory: string | null;
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

type TrafficComparePayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  summary: {
    firebaseVisits: number;
    vercelVisits: number;
    deltaVisits: number;
    deltaPercent: number | null;
  };
  daily: Array<{
    dateKey: string;
    firebaseVisits: number;
    vercelVisits: number;
    deltaVisits: number;
    deltaPercent: number | null;
  }>;
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

function toProviderLabel(provider: ProviderFilter | string) {
  if (provider === "firebase") {
    return "Firebase";
  }
  if (provider === "vercel") {
    return "Vercel";
  }
  if (provider === "all") {
    return "Tous";
  }
  return provider;
}

function toProviderBadge(provider: string) {
  if (provider === "firebase") {
    return <Badge variant="success">Firebase</Badge>;
  }
  if (provider === "vercel") {
    return <Badge variant="warning">Vercel</Badge>;
  }
  return <Badge variant="secondary">{provider}</Badge>;
}

function toIsoIfPossible(value: string) {
  if (!value.trim()) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

async function fetchTrafficAnalytics(params: {
  range: RangeFilter;
  provider: ProviderFilter;
  start?: string;
  end?: string;
  limit: number;
  offset: number;
}) {
  const query = new URLSearchParams();
  query.set("range", params.range);
  query.set("provider", params.provider);
  query.set("limit", String(params.limit));
  query.set("offset", String(params.offset));

  if (params.range === "custom") {
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
  }

  const response = await fetch(`/api/admin/v1/analytics/traffic?${query.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: TrafficPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les analytics visites." : payload.error?.message);
  }

  return payload.data;
}

async function fetchTrafficCompare(params: {
  range: RangeFilter;
  start?: string;
  end?: string;
}) {
  const query = new URLSearchParams();
  query.set("range", params.range);

  if (params.range === "custom") {
    if (params.start) query.set("start", params.start);
    if (params.end) query.set("end", params.end);
  }

  const response = await fetch(`/api/admin/v1/analytics/traffic/compare?${query.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: TrafficComparePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger la comparaison traffic." : payload.error?.message);
  }

  return payload.data;
}

export default function AnalyticsTrafficPage() {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [provider, setProvider] = useState<ProviderFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const customStartIso = useMemo(() => toIsoIfPossible(customStart), [customStart]);
  const customEndIso = useMemo(() => toIsoIfPossible(customEnd), [customEnd]);

  const canQuery = useMemo(() => {
    if (range !== "custom") {
      return true;
    }
    return customStartIso.length > 0 && customEndIso.length > 0;
  }, [customEndIso, customStartIso, range]);

  const trafficQuery = useQuery({
    queryKey: [
      "analytics",
      "traffic",
      range,
      provider,
      customStartIso,
      customEndIso,
      offset,
      limit,
    ],
    queryFn: () =>
      fetchTrafficAnalytics({
        range,
        provider,
        start: range === "custom" ? customStartIso : undefined,
        end: range === "custom" ? customEndIso : undefined,
        limit,
        offset,
      }),
    enabled: canQuery,
  });

  const compareQuery = useQuery({
    queryKey: ["analytics", "traffic", "compare", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchTrafficCompare({
        range,
        start: range === "custom" ? customStartIso : undefined,
        end: range === "custom" ? customEndIso : undefined,
      }),
    enabled: canQuery,
  });

  const data = trafficQuery.data;
  const compare = compareQuery.data;
  const loading = trafficQuery.isLoading || compareQuery.isLoading;
  const error = trafficQuery.error?.message ?? compareQuery.error?.message ?? null;

  // `daily` contient une ligne par (jour × fournisseur) : on agrège par jour,
  // sinon la courbe afficherait plusieurs points pour une même date.
  const daily = data?.daily;
  const dailyTotals = useMemo(() => {
    if (!daily?.length) {
      return [];
    }
    const byDate = new Map<string, { dateKey: string; visits: number; uniqueVisitors: number; pageViews: number }>();
    for (const row of daily) {
      const current = byDate.get(row.dateKey) ?? {
        dateKey: row.dateKey,
        visits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
      };
      current.visits += row.visits ?? 0;
      current.uniqueVisitors += row.uniqueVisitors ?? 0;
      current.pageViews += row.pageViews ?? 0;
      byDate.set(row.dateKey, current);
    }
    return Array.from(byDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [daily]);

  // Barres horizontales : on tronque les chemins longs côté axe, la valeur
  // complète reste dans l'infobulle et dans le tableau plus bas.
  const topPages = data?.topPages;
  const topPagesChartData = useMemo(() => {
    if (!topPages?.length) {
      return [];
    }
    return topPages.slice(0, 8).map((entry) => ({
      page: entry.page.length > 28 ? `${entry.page.slice(0, 27)}…` : entry.page,
      pageViews: entry.pageViews,
    }));
  }, [topPages]);
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("provider", provider);
    params.set("maxRows", "50000");

    if (range === "custom") {
      if (customStartIso) params.set("start", customStartIso);
      if (customEndIso) params.set("end", customEndIso);
    }

    return `/api/admin/v1/analytics/traffic/export?${params.toString()}`;
  }, [customEndIso, customStartIso, provider, range]);

  const onResetFilters = useCallback(() => {
    setRange("7d");
    setProvider("all");
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

  const compareTrendBadge =
    compare?.summary.deltaVisits && compare.summary.deltaVisits > 0 ? (
      <Badge variant="warning">Vercel au-dessus</Badge>
    ) : compare?.summary.deltaVisits && compare.summary.deltaVisits < 0 ? (
      <Badge variant="success">Firebase au-dessus</Badge>
    ) : (
      <Badge variant="secondary">Équilibré</Badge>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics visites"
        description="Centralisation des métriques de visites Firebase et Vercel."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void trafficQuery.refetch();
                void compareQuery.refetch();
              }}
              disabled={loading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(exportUrl, "_blank", "noopener,noreferrer")}
              disabled={!canQuery}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Events ingérés</p>
            <p className="text-2xl font-semibold text-foreground">{data?.summary.totalEvents ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Visites</p>
            <p className="text-2xl font-semibold text-foreground">{data?.summary.visits ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Visiteurs uniques</p>
            <p className="text-2xl font-semibold text-foreground">{data?.summary.uniqueVisitors ?? 0}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Pages vues</p>
            <p className="text-2xl font-semibold text-primary">{data?.summary.pageViews ?? 0}</p>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold text-ink">Évolution du trafic</h2>
            <p className="text-sm text-muted-foreground">
              Visites, visiteurs uniques et pages vues par jour. Même unité (comptages), donc un seul axe.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <TimeSeriesChart
                data={dailyTotals}
                series={[
                  { dataKey: "visits", label: "Visites" },
                  { dataKey: "uniqueVisitors", label: "Visiteurs uniques" },
                  { dataKey: "pageViews", label: "Pages vues" },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-ink">Pages les plus vues</h2>
            <p className="text-sm text-muted-foreground">Top 8 sur la période.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <RankedBarChart
                data={topPagesChartData}
                categoryKey="page"
                valueKey="pageViews"
                valueLabel="Pages vues"
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Filtres</h2>
          <p className="text-sm text-muted-foreground">Par défaut, période glissante de 7 jours.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <select
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
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
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value as ProviderFilter);
                setOffset(0);
              }}
            >
              <option value="all">Tous les providers</option>
              <option value="firebase">Firebase</option>
              <option value="vercel">Vercel</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={onResetFilters}
              className="justify-start"
            >
              Réinitialiser les filtres
            </Button>

            <div className="flex items-center text-xs text-muted-foreground">
              Fenêtre active: {toDateLabel(data?.period.startAt)} - {toDateLabel(data?.period.endAt)}
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
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Événements récents</h2>
            <p className="text-sm text-muted-foreground">
              {data?.page.totalCount ?? 0} event(s) - source: {toProviderLabel(provider)}
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Provider</th>
                        <th className="py-2 pr-4 font-medium">Métrique</th>
                        <th className="py-2 pr-4 font-medium">Valeur</th>
                        <th className="py-2 pr-4 font-medium">Page</th>
                        <th className="py-2 pr-4 font-medium">Pays/Appareil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.events.length ? (
                        data.events.map((event, index) => (
                          <tr
                            key={`${event.occurredAt}-${event.provider}-${event.metricName}-${index}`}
                            className="border-b border-border align-top"
                          >
                            <td className="py-3 pr-4 text-foreground">{toDateLabel(event.occurredAt)}</td>
                            <td className="py-3 pr-4">{toProviderBadge(event.provider)}</td>
                            <td className="py-3 pr-4 text-foreground">{event.metricName}</td>
                            <td className="py-3 pr-4 font-medium text-foreground">{event.metricValue}</td>
                            <td className="py-3 pr-4 text-xs text-foreground">{event.pagePath || "-"}</td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                              {(event.country || "--") + " / " + (event.deviceCategory || "--")}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                            Aucun event traffic sur cette période.
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
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Comparaison visites</h2>
            {compareTrendBadge}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              <p className="text-muted-foreground">Firebase</p>
              <p className="text-lg font-semibold text-foreground">{compare?.summary.firebaseVisits ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              <p className="text-muted-foreground">Vercel</p>
              <p className="text-lg font-semibold text-foreground">{compare?.summary.vercelVisits ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
              <p className="text-muted-foreground">Delta (Vercel - Firebase)</p>
              <p className="text-lg font-semibold text-foreground">{compare?.summary.deltaVisits ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                {compare?.summary.deltaPercent == null
                  ? "N/A"
                  : `${compare?.summary.deltaPercent}%`}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Top pages</h3>
              <div className="space-y-1">
                {data?.topPages.length ? (
                  data.topPages.slice(0, 8).map((page) => (
                    <div
                      key={page.page}
                      className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-xs"
                    >
                      <span className="truncate pr-2 text-foreground">{page.page}</span>
                      <span className="font-medium text-foreground">{page.pageViews}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune page vue pour cette période.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Répartition providers</h3>
              <div className="space-y-1">
                {data?.providers.map((item) => (
                  <p key={item.provider} className="text-xs text-muted-foreground">
                    {toProviderLabel(item.provider)}: {item.visits} visite(s), {item.pageViews} pages vues
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">Détail quotidien (visites)</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Provider</th>
                    <th className="py-2 pr-4 font-medium">Visites</th>
                    <th className="py-2 pr-4 font-medium">Visiteurs uniques</th>
                    <th className="py-2 pr-4 font-medium">Pages vues</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.daily.length ? (
                    data.daily.map((row, index) => (
                      <tr key={`${row.dateKey}-${row.provider}-${index}`} className="border-b border-border">
                        <td className="py-2 pr-4 text-foreground">{row.dateKey}</td>
                        <td className="py-2 pr-4">{toProviderBadge(row.provider)}</td>
                        <td className="py-2 pr-4 text-foreground">{row.visits}</td>
                        <td className="py-2 pr-4 text-foreground">{row.uniqueVisitors}</td>
                        <td className="py-2 pr-4 text-foreground">{row.pageViews}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        Pas de données quotidiennes sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            Comparatif calculé sur la métrique `visit`.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
