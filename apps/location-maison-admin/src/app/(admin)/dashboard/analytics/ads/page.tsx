"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, RefreshCcw, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type RangeFilter = "24h" | "7d" | "30d" | "custom";

type AdsOverviewPayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  summary: {
    revenueToday: number;
    revenue7d: number;
    revenue30d: number;
    revenueMtd: number;
    periodRevenue: number;
    periodPageViews: number;
    periodSessions: number;
    pageViewsRpm: number | null;
    impressionsRpm: number | null;
    revenuePer1kSessions: number | null;
    fillRate: number | null;
    ctr: number | null;
    viewability: number | null;
    latestUpdatedAt: string | null;
  };
  dataAvailability: {
    adsMetricsDaily: boolean;
    adsenseReportingRaw: boolean;
    adsSlotEvents: boolean;
    adsRevenueVsTrafficDaily: boolean;
  };
};

type AdsTimeseriesPayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  points: Array<{
    dateKey: string;
    estimatedEarnings: number;
    pageViews: number;
    sessions: number;
    revenuePer1kSessions: number | null;
    pageViewsRpm: number | null;
    ctr: number | null;
    fillRate: number | null;
    viewability: number | null;
  }>;
};

type AdsPlacementsPayload = {
  rows: Array<{
    slotId: string;
    pageTemplate: string;
    estimatedEarnings: number;
    adRequests: number;
    matchedAdRequests: number;
    fillRate: number | null;
    totalImpressions: number;
    clicks: number;
    ctr: number | null;
    pageViewsRpm: number | null;
    viewability: number | null;
  }>;
  page: {
    limit: number;
    offset: number;
    returned: number;
    totalCount: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  source: "ads_metrics_daily" | "ads_slot_events" | "none";
};

type AdsPagesPayload = {
  rows: Array<{
    pageKey: string;
    estimatedEarnings: number;
    pageViews: number;
    adRequests: number;
    matchedAdRequests: number;
    totalImpressions: number;
    clicks: number;
    pageViewsRpm: number | null;
    impressionsRpm: number | null;
    ctr: number | null;
    fillRate: number | null;
  }>;
  page: {
    limit: number;
    offset: number;
    returned: number;
    totalCount: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
  source: "adsense_reporting_raw" | "ads_metrics_daily" | "none";
};

type AdsAlertsPayload = {
  generatedAt: string;
  alerts: Array<{
    id: string;
    level: "info" | "warning" | "critical";
    title: string;
    message: string;
    metric: string;
    value: number | null;
    threshold: number | null;
    dateKey: string | null;
  }>;
};

type AdsComparisonPayload = {
  generatedAt: string;
  rows: Array<{
    key: "J-1" | "7j" | "30j" | "MTD";
    label: string;
    currentStartDate: string;
    currentEndDate: string;
    previousStartDate: string;
    previousEndDate: string;
    currentRevenue: number;
    previousRevenue: number;
    revenueDelta: number;
    revenueDeltaPercent: number | null;
    currentFillRate: number | null;
    previousFillRate: number | null;
    fillRateDeltaPercent: number | null;
    currentCtr: number | null;
    previousCtr: number | null;
    ctrDeltaPercent: number | null;
    currentPageViewsRpm: number | null;
    previousPageViewsRpm: number | null;
    pageViewsRpmDeltaPercent: number | null;
  }>;
};

function formatMoney(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

function formatNumber(value: number | null | undefined) {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("fr-FR").format(safeValue);
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return `${normalized.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

function formatDeltaPercent(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}

function toIsoIfPossible(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? trimmed : date.toISOString();
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

function queryParamsFromRange(input: {
  range: RangeFilter;
  startIso: string;
  endIso: string;
}) {
  const params = new URLSearchParams();
  params.set("range", input.range);
  if (input.range === "custom") {
    if (input.startIso) params.set("start", input.startIso);
    if (input.endIso) params.set("end", input.endIso);
  }
  return params;
}

async function fetchJson<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url);
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

function alertLevelBadge(level: "info" | "warning" | "critical") {
  if (level === "critical") {
    return <Badge variant="danger">Critique</Badge>;
  }
  if (level === "warning") {
    return <Badge variant="warning">Alerte</Badge>;
  }
  return <Badge variant="neutral">Info</Badge>;
}

function sourceBadge(source: "ads_metrics_daily" | "ads_slot_events" | "adsense_reporting_raw" | "none") {
  if (source === "adsense_reporting_raw") {
    return <Badge variant="success">AdSense raw</Badge>;
  }
  if (source === "ads_metrics_daily") {
    return <Badge variant="warning">Agrégat quotidien</Badge>;
  }
  if (source === "ads_slot_events") {
    return <Badge variant="neutral">Slots events</Badge>;
  }
  return <Badge variant="neutral">Aucune source</Badge>;
}

export default function AnalyticsAdsPage() {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [placementsOffset, setPlacementsOffset] = useState(0);
  const [pagesOffset, setPagesOffset] = useState(0);

  const limit = 20;
  const customStartIso = useMemo(() => toIsoIfPossible(customStart), [customStart]);
  const customEndIso = useMemo(() => toIsoIfPossible(customEnd), [customEnd]);

  const canQuery = useMemo(() => {
    if (range !== "custom") {
      return true;
    }
    return customStartIso.length > 0 && customEndIso.length > 0;
  }, [customEndIso, customStartIso, range]);

  const commonParams = useMemo(
    () =>
      queryParamsFromRange({
        range,
        startIso: customStartIso,
        endIso: customEndIso,
      }),
    [customEndIso, customStartIso, range],
  );

  const overviewQuery = useQuery({
    queryKey: ["analytics", "ads", "overview", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchJson<AdsOverviewPayload>(
        `/api/admin/v1/analytics/ads/overview?${commonParams.toString()}`,
        "Impossible de charger la synthèse monétisation.",
      ),
    enabled: canQuery,
  });

  const timeseriesQuery = useQuery({
    queryKey: ["analytics", "ads", "timeseries", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchJson<AdsTimeseriesPayload>(
        `/api/admin/v1/analytics/ads/revenue-timeseries?${commonParams.toString()}`,
        "Impossible de charger la série revenus.",
      ),
    enabled: canQuery,
  });

  const placementsQuery = useQuery({
    queryKey: [
      "analytics",
      "ads",
      "placements",
      range,
      customStartIso,
      customEndIso,
      placementsOffset,
      limit,
    ],
    queryFn: () => {
      const params = new URLSearchParams(commonParams);
      params.set("limit", String(limit));
      params.set("offset", String(placementsOffset));
      return fetchJson<AdsPlacementsPayload>(
        `/api/admin/v1/analytics/ads/placements?${params.toString()}`,
        "Impossible de charger la performance des emplacements.",
      );
    },
    enabled: canQuery,
  });

  const pagesQuery = useQuery({
    queryKey: [
      "analytics",
      "ads",
      "pages",
      range,
      customStartIso,
      customEndIso,
      pagesOffset,
      limit,
    ],
    queryFn: () => {
      const params = new URLSearchParams(commonParams);
      params.set("limit", String(limit));
      params.set("offset", String(pagesOffset));
      return fetchJson<AdsPagesPayload>(
        `/api/admin/v1/analytics/ads/pages?${params.toString()}`,
        "Impossible de charger la performance des pages.",
      );
    },
    enabled: canQuery,
  });

  const alertsQuery = useQuery({
    queryKey: ["analytics", "ads", "alerts", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchJson<AdsAlertsPayload>(
        `/api/admin/v1/analytics/ads/alerts?${commonParams.toString()}`,
        "Impossible de charger les alertes monétisation.",
      ),
    enabled: canQuery,
  });

  const comparisonQuery = useQuery({
    queryKey: ["analytics", "ads", "compare"],
    queryFn: () =>
      fetchJson<AdsComparisonPayload>(
        "/api/admin/v1/analytics/ads/compare",
        "Impossible de charger les comparaisons de période.",
      ),
  });

  const isLoading =
    overviewQuery.isLoading ||
    timeseriesQuery.isLoading ||
    placementsQuery.isLoading ||
    pagesQuery.isLoading ||
    alertsQuery.isLoading ||
    comparisonQuery.isLoading;

  const error =
    overviewQuery.error?.message ||
    timeseriesQuery.error?.message ||
    placementsQuery.error?.message ||
    pagesQuery.error?.message ||
    comparisonQuery.error?.message ||
    alertsQuery.error?.message ||
    null;

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams(commonParams);
    return `/api/admin/v1/analytics/ads/export?${params.toString()}`;
  }, [commonParams]);

  const onResetFilters = useCallback(() => {
    setRange("7d");
    setCustomStart("");
    setCustomEnd("");
    setPlacementsOffset(0);
    setPagesOffset(0);
  }, []);

  const refreshAll = useCallback(() => {
    void overviewQuery.refetch();
    void timeseriesQuery.refetch();
    void placementsQuery.refetch();
    void pagesQuery.refetch();
    void comparisonQuery.refetch();
    void alertsQuery.refetch();
  }, [alertsQuery, comparisonQuery, overviewQuery, pagesQuery, placementsQuery, timeseriesQuery]);

  const unavailableSources = useMemo(() => {
    const availability = overviewQuery.data?.dataAvailability;
    if (!availability) {
      return [];
    }
    const sources: string[] = [];
    if (!availability.adsMetricsDaily) {
      sources.push("ads_metrics_daily");
    }
    if (!availability.adsenseReportingRaw) {
      sources.push("adsense_reporting_raw");
    }
    if (!availability.adsSlotEvents) {
      sources.push("ads_slot_events");
    }
    return sources;
  }, [overviewQuery.data?.dataAvailability]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics monétisation"
        description="Suivi du revenu AdSense, de la performance des emplacements et des alertes clés."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={refreshAll} disabled={isLoading}>
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Revenu aujourd&apos;hui</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatMoney(overviewQuery.data?.summary.revenueToday)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Revenu 7 jours</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatMoney(overviewQuery.data?.summary.revenue7d)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Revenu 30 jours</p>
            <p className="text-2xl font-semibold text-brand-700">
              {formatMoney(overviewQuery.data?.summary.revenue30d)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Revenu MTD</p>
            <p className="text-2xl font-semibold text-slate-900">
              {formatMoney(overviewQuery.data?.summary.revenueMtd)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Page views RPM</p>
            <p className="text-2xl font-semibold text-slate-900">
              {overviewQuery.data?.summary.pageViewsRpm == null
                ? "N/A"
                : formatMoney(overviewQuery.data.summary.pageViewsRpm)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Fill rate / CTR</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatPercent(overviewQuery.data?.summary.fillRate, 1)} /{" "}
              {formatPercent(overviewQuery.data?.summary.ctr, 2)}
            </p>
            <p className="text-xs text-slate-500">
              Viewability: {formatPercent(overviewQuery.data?.summary.viewability, 1)}
            </p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Filtres</h2>
          <p className="text-sm text-slate-600">Par défaut, période glissante de 7 jours.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={range}
              onChange={(event) => {
                setRange(event.target.value as RangeFilter);
                setPlacementsOffset(0);
                setPagesOffset(0);
              }}
            >
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="custom">Période personnalisée</option>
            </select>

            <Button type="button" variant="outline" onClick={onResetFilters} className="justify-start">
              Réinitialiser les filtres
            </Button>

            <div className="flex items-center text-xs text-slate-500 lg:col-span-2">
              Fenêtre active: {toDateLabel(overviewQuery.data?.period.startAt)} -{" "}
              {toDateLabel(overviewQuery.data?.period.endAt)}
            </div>
          </div>

          {range === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(event) => {
                  setCustomStart(event.target.value);
                  setPlacementsOffset(0);
                  setPagesOffset(0);
                }}
              />
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(event) => {
                  setCustomEnd(event.target.value);
                  setPlacementsOffset(0);
                  setPagesOffset(0);
                }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Comparaisons de période</h2>
          <p className="text-sm text-slate-600">J-1, 7 jours, 30 jours et MTD.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4 font-medium">Fenêtre</th>
                  <th className="py-2 pr-4 font-medium">Revenu actuel</th>
                  <th className="py-2 pr-4 font-medium">Revenu précédent</th>
                  <th className="py-2 pr-4 font-medium">Delta revenu</th>
                  <th className="py-2 pr-4 font-medium">Delta fill rate</th>
                  <th className="py-2 pr-4 font-medium">Delta CTR</th>
                  <th className="py-2 pr-4 font-medium">Delta RPM</th>
                </tr>
              </thead>
              <tbody>
                {comparisonQuery.data?.rows.length ? (
                  comparisonQuery.data.rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-700">
                        <p className="font-medium text-slate-900">{row.key}</p>
                        <p className="text-xs text-slate-500">
                          {row.currentStartDate} - {row.currentEndDate}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-slate-900">{formatMoney(row.currentRevenue)}</td>
                      <td className="py-2 pr-4 text-slate-700">{formatMoney(row.previousRevenue)}</td>
                      <td
                        className={`py-2 pr-4 ${
                          (row.revenueDeltaPercent ?? 0) < 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {formatDeltaPercent(row.revenueDeltaPercent)}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {formatDeltaPercent(row.fillRateDeltaPercent)}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">{formatDeltaPercent(row.ctrDeltaPercent)}</td>
                      <td className="py-2 pr-4 text-slate-700">
                        {formatDeltaPercent(row.pageViewsRpmDeltaPercent)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-500">
                      Données insuffisantes pour la comparaison de période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {unavailableSources.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sources BigQuery indisponibles pour l&apos;instant: {unavailableSources.join(", ")}. Le
          dashboard continue avec les données disponibles.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Revenus journaliers</h2>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Revenu</th>
                      <th className="py-2 pr-4 font-medium">Sessions</th>
                      <th className="py-2 pr-4 font-medium">Page views</th>
                      <th className="py-2 pr-4 font-medium">RPM</th>
                      <th className="py-2 pr-4 font-medium">Fill rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeseriesQuery.data?.points.length ? (
                      timeseriesQuery.data.points.map((row) => (
                        <tr key={row.dateKey} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-slate-700">{row.dateKey}</td>
                          <td className="py-2 pr-4 text-slate-900">{formatMoney(row.estimatedEarnings)}</td>
                          <td className="py-2 pr-4 text-slate-700">{formatNumber(row.sessions)}</td>
                          <td className="py-2 pr-4 text-slate-700">{formatNumber(row.pageViews)}</td>
                          <td className="py-2 pr-4 text-slate-700">
                            {row.pageViewsRpm == null ? "N/A" : formatMoney(row.pageViewsRpm)}
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{formatPercent(row.fillRate, 1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                          Aucune donnée de revenus sur cette période.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Alertes</h2>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsQuery.data?.alerts.length ? (
              alertsQuery.data.alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                    {alertLevelBadge(alert.level)}
                  </div>
                  <p className="text-xs text-slate-600">{alert.message}</p>
                  {alert.dateKey ? <p className="mt-1 text-xs text-slate-500">Date: {alert.dateKey}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Aucune alerte.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Performance emplacements</h2>
            {sourceBadge(placementsQuery.data?.source ?? "none")}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-4 font-medium">Slot</th>
                    <th className="py-2 pr-4 font-medium">Template</th>
                    <th className="py-2 pr-4 font-medium">Revenu</th>
                    <th className="py-2 pr-4 font-medium">Fill rate</th>
                    <th className="py-2 pr-4 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {placementsQuery.data?.rows.length ? (
                    placementsQuery.data.rows.map((row) => (
                      <tr key={`${row.slotId}-${row.pageTemplate}`} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-700">{row.slotId}</td>
                        <td className="py-2 pr-4 text-slate-700">{row.pageTemplate}</td>
                        <td className="py-2 pr-4 text-slate-900">{formatMoney(row.estimatedEarnings)}</td>
                        <td className="py-2 pr-4 text-slate-700">{formatPercent(row.fillRate, 1)}</td>
                        <td className="py-2 pr-4 text-slate-700">{formatPercent(row.ctr, 2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                        Aucun emplacement disponible sur cette période.
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
                onClick={() => setPlacementsOffset((value) => Math.max(0, value - limit))}
                disabled={(placementsQuery.data?.page.offset ?? 0) === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (placementsQuery.data?.page.hasMore) {
                    setPlacementsOffset((value) => value + limit);
                  }
                }}
                disabled={!placementsQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Performance pages</h2>
            {sourceBadge(pagesQuery.data?.source ?? "none")}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-4 font-medium">Page</th>
                    <th className="py-2 pr-4 font-medium">Revenu</th>
                    <th className="py-2 pr-4 font-medium">Pages vues</th>
                    <th className="py-2 pr-4 font-medium">RPM</th>
                  </tr>
                </thead>
                <tbody>
                  {pagesQuery.data?.rows.length ? (
                    pagesQuery.data.rows.map((row) => (
                      <tr key={row.pageKey} className="border-b border-slate-100">
                        <td className="max-w-[250px] truncate py-2 pr-4 text-slate-700">{row.pageKey}</td>
                        <td className="py-2 pr-4 text-slate-900">{formatMoney(row.estimatedEarnings)}</td>
                        <td className="py-2 pr-4 text-slate-700">{formatNumber(row.pageViews)}</td>
                        <td className="py-2 pr-4 text-slate-700">
                          {row.pageViewsRpm == null ? "N/A" : formatMoney(row.pageViewsRpm)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                        Aucune page monétisée sur cette période.
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
                onClick={() => setPagesOffset((value) => Math.max(0, value - limit))}
                disabled={(pagesQuery.data?.page.offset ?? 0) === 0}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (pagesQuery.data?.page.hasMore) {
                    setPagesOffset((value) => value + limit);
                  }
                }}
                disabled={!pagesQuery.data?.page.hasMore}
              >
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <TrendingUp className="h-3.5 w-3.5" />
        Dernière mise à jour source: {toDateLabel(overviewQuery.data?.summary.latestUpdatedAt)}
      </div>
    </div>
  );
}
