"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCcw, Search, Users } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { KpiCard } from "@/components/ui-kit/kpi-card";
import { PageHeader } from "@/components/ui-kit/page-header";
import { cn } from "@/lib/utils";

type PresenceOnlinePayload = {
  summary: {
    totalSubjects: number;
    onlineSubjects: number;
    offlineSubjects: number;
  };
};

type SearchAnalyticsPayload = {
  summary: {
    totalSearches: number;
    withResults: number;
    withoutResults: number;
    pendingResults: number;
    successRate: number;
  };
};

type TrafficAnalyticsPayload = {
  summary: {
    totalEvents: number;
    visits: number;
    uniqueVisitors: number;
    pageViews: number;
  };
};

type JsonApiSuccess<T> = {
  success: true;
  data: T;
};

type JsonApiFailure = {
  success: false;
  error?: {
    message?: string;
  };
};

type TimeWindow = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function buildWindow(anchorDate: Date, durationMs: number): TimeWindow {
  const currentEndDate = new Date(anchorDate);
  const currentStartDate = new Date(currentEndDate.getTime() - durationMs);
  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(previousEndDate.getTime() - durationMs);

  return {
    currentStart: currentStartDate.toISOString(),
    currentEnd: currentEndDate.toISOString(),
    previousStart: previousStartDate.toISOString(),
    previousEnd: previousEndDate.toISOString(),
  };
}

function toTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return {
        value: "0%",
        positive: true,
      };
    }

    return {
      value: "Nouveau",
      positive: true,
    };
  }

  const deltaPercent = ((current - previous) / previous) * 100;
  const rounded = Math.round(deltaPercent * 10) / 10;
  const sign = rounded > 0 ? "+" : "";

  return {
    value: `${sign}${rounded.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}%`,
    positive: rounded >= 0,
  };
}

async function fetchJsonApi<T>(url: string, fallbackMessage: string) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json()) as JsonApiSuccess<T> | JsonApiFailure;

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

export default function DashboardPage() {
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const presenceWindow = useMemo(
    () => buildWindow(anchorDate, 24 * 60 * 60 * 1000),
    [anchorDate],
  );
  const analyticsWindow = useMemo(
    () => buildWindow(anchorDate, 7 * 24 * 60 * 60 * 1000),
    [anchorDate],
  );

  const adminsOnlineCurrentQuery = useQuery({
    queryKey: [
      "dashboard",
      "presence",
      "admins-online",
      presenceWindow.currentStart,
      presenceWindow.currentEnd,
    ],
    queryFn: () =>
      fetchJsonApi<PresenceOnlinePayload>(
        `/api/admin/v1/analytics/presence/admins-online?range=custom&start=${encodeURIComponent(
          presenceWindow.currentStart,
        )}&end=${encodeURIComponent(presenceWindow.currentEnd)}&limit=1`,
        "Impossible de charger la présence des admins.",
      ),
  });

  const adminsOnlinePreviousQuery = useQuery({
    queryKey: [
      "dashboard",
      "presence",
      "admins-online-previous",
      presenceWindow.previousStart,
      presenceWindow.previousEnd,
    ],
    queryFn: () =>
      fetchJsonApi<PresenceOnlinePayload>(
        `/api/admin/v1/analytics/presence/admins-online?range=custom&start=${encodeURIComponent(
          presenceWindow.previousStart,
        )}&end=${encodeURIComponent(presenceWindow.previousEnd)}&limit=1`,
        "Impossible de charger la présence des admins (période précédente).",
      ),
  });

  const usersOnlineCurrentQuery = useQuery({
    queryKey: [
      "dashboard",
      "presence",
      "users-online",
      presenceWindow.currentStart,
      presenceWindow.currentEnd,
    ],
    queryFn: () =>
      fetchJsonApi<PresenceOnlinePayload>(
        `/api/admin/v1/analytics/presence/users-online?range=custom&start=${encodeURIComponent(
          presenceWindow.currentStart,
        )}&end=${encodeURIComponent(presenceWindow.currentEnd)}&limit=1`,
        "Impossible de charger la présence des utilisateurs.",
      ),
  });

  const usersOnlinePreviousQuery = useQuery({
    queryKey: [
      "dashboard",
      "presence",
      "users-online-previous",
      presenceWindow.previousStart,
      presenceWindow.previousEnd,
    ],
    queryFn: () =>
      fetchJsonApi<PresenceOnlinePayload>(
        `/api/admin/v1/analytics/presence/users-online?range=custom&start=${encodeURIComponent(
          presenceWindow.previousStart,
        )}&end=${encodeURIComponent(presenceWindow.previousEnd)}&limit=1`,
        "Impossible de charger la présence des utilisateurs (période précédente).",
      ),
  });

  const searchesCurrentQuery = useQuery({
    queryKey: [
      "dashboard",
      "analytics",
      "searches",
      analyticsWindow.currentStart,
      analyticsWindow.currentEnd,
    ],
    queryFn: () =>
      fetchJsonApi<SearchAnalyticsPayload>(
        `/api/admin/v1/analytics/searches?range=custom&start=${encodeURIComponent(
          analyticsWindow.currentStart,
        )}&end=${encodeURIComponent(analyticsWindow.currentEnd)}&limit=1&offset=0&topLimit=1`,
        "Impossible de charger les recherches analytics.",
      ),
  });

  const searchesPreviousQuery = useQuery({
    queryKey: [
      "dashboard",
      "analytics",
      "searches-previous",
      analyticsWindow.previousStart,
      analyticsWindow.previousEnd,
    ],
    queryFn: () =>
      fetchJsonApi<SearchAnalyticsPayload>(
        `/api/admin/v1/analytics/searches?range=custom&start=${encodeURIComponent(
          analyticsWindow.previousStart,
        )}&end=${encodeURIComponent(analyticsWindow.previousEnd)}&limit=1&offset=0&topLimit=1`,
        "Impossible de charger les recherches analytics (période précédente).",
      ),
  });

  const trafficCurrentQuery = useQuery({
    queryKey: [
      "dashboard",
      "analytics",
      "traffic",
      analyticsWindow.currentStart,
      analyticsWindow.currentEnd,
    ],
    queryFn: () =>
      fetchJsonApi<TrafficAnalyticsPayload>(
        `/api/admin/v1/analytics/traffic?range=custom&start=${encodeURIComponent(
          analyticsWindow.currentStart,
        )}&end=${encodeURIComponent(
          analyticsWindow.currentEnd,
        )}&provider=all&limit=1&offset=0&topPagesLimit=1`,
        "Impossible de charger les visites analytics.",
      ),
  });

  const trafficPreviousQuery = useQuery({
    queryKey: [
      "dashboard",
      "analytics",
      "traffic-previous",
      analyticsWindow.previousStart,
      analyticsWindow.previousEnd,
    ],
    queryFn: () =>
      fetchJsonApi<TrafficAnalyticsPayload>(
        `/api/admin/v1/analytics/traffic?range=custom&start=${encodeURIComponent(
          analyticsWindow.previousStart,
        )}&end=${encodeURIComponent(
          analyticsWindow.previousEnd,
        )}&provider=all&limit=1&offset=0&topPagesLimit=1`,
        "Impossible de charger les visites analytics (période précédente).",
      ),
  });

  const hasError = useMemo(
    () =>
      Boolean(
        adminsOnlineCurrentQuery.error ||
          adminsOnlinePreviousQuery.error ||
          usersOnlineCurrentQuery.error ||
          usersOnlinePreviousQuery.error ||
          searchesCurrentQuery.error ||
          searchesPreviousQuery.error ||
          trafficCurrentQuery.error ||
          trafficPreviousQuery.error,
      ),
    [
      adminsOnlineCurrentQuery.error,
      adminsOnlinePreviousQuery.error,
      usersOnlineCurrentQuery.error,
      usersOnlinePreviousQuery.error,
      searchesCurrentQuery.error,
      searchesPreviousQuery.error,
      trafficCurrentQuery.error,
      trafficPreviousQuery.error,
    ],
  );

  const isRefreshing =
    adminsOnlineCurrentQuery.isFetching ||
    adminsOnlinePreviousQuery.isFetching ||
    usersOnlineCurrentQuery.isFetching ||
    usersOnlinePreviousQuery.isFetching ||
    searchesCurrentQuery.isFetching ||
    searchesPreviousQuery.isFetching ||
    trafficCurrentQuery.isFetching ||
    trafficPreviousQuery.isFetching;

  const adminsCurrent = adminsOnlineCurrentQuery.data?.summary.onlineSubjects ?? 0;
  const adminsPrevious = adminsOnlinePreviousQuery.data?.summary.onlineSubjects ?? 0;
  const usersCurrent = usersOnlineCurrentQuery.data?.summary.onlineSubjects ?? 0;
  const usersPrevious = usersOnlinePreviousQuery.data?.summary.onlineSubjects ?? 0;
  const searchesCurrent = searchesCurrentQuery.data?.summary.totalSearches ?? 0;
  const searchesPrevious = searchesPreviousQuery.data?.summary.totalSearches ?? 0;
  const visitsCurrent = trafficCurrentQuery.data?.summary.visits ?? 0;
  const visitsPrevious = trafficPreviousQuery.data?.summary.visits ?? 0;

  const adminsTrend =
    adminsOnlineCurrentQuery.data && adminsOnlinePreviousQuery.data
      ? toTrend(adminsCurrent, adminsPrevious)
      : undefined;
  const usersTrend =
    usersOnlineCurrentQuery.data && usersOnlinePreviousQuery.data
      ? toTrend(usersCurrent, usersPrevious)
      : undefined;
  const searchesTrend =
    searchesCurrentQuery.data && searchesPreviousQuery.data
      ? toTrend(searchesCurrent, searchesPrevious)
      : undefined;
  const visitsTrend =
    trafficCurrentQuery.data && trafficPreviousQuery.data
      ? toTrend(visitsCurrent, visitsPrevious)
      : undefined;

  const handleRefresh = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d'ensemble"
        description="Suivi en direct de l'activité admin, des recherches et des visites."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Admins en ligne (24h)"
          value={adminsOnlineCurrentQuery.data ? formatNumber(adminsCurrent) : "--"}
          helper={
            adminsOnlineCurrentQuery.data
              ? `${formatNumber(adminsOnlineCurrentQuery.data.summary.totalSubjects)} observés`
              : "En attente de données"
          }
          trend={adminsTrend}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Utilisateurs en ligne (24h)"
          value={usersOnlineCurrentQuery.data ? formatNumber(usersCurrent) : "--"}
          helper={
            usersOnlineCurrentQuery.data
              ? `${formatNumber(usersOnlineCurrentQuery.data.summary.totalSubjects)} observés`
              : "En attente de données"
          }
          trend={usersTrend}
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="Recherches (7 jours)"
          value={searchesCurrentQuery.data ? formatNumber(searchesCurrent) : "--"}
          helper={
            searchesCurrentQuery.data
              ? `${formatNumber(searchesCurrentQuery.data.summary.withResults)} avec résultats`
              : "En attente de données"
          }
          trend={searchesTrend}
          icon={<Search className="h-4 w-4" />}
        />
        <KpiCard
          label="Visites (7 jours)"
          value={trafficCurrentQuery.data ? formatNumber(visitsCurrent) : "--"}
          helper={
            trafficCurrentQuery.data
              ? `${formatNumber(trafficCurrentQuery.data.summary.uniqueVisitors)} visiteurs uniques`
              : "En attente de données"
          }
          trend={visitsTrend}
          icon={<Activity className="h-4 w-4" />}
        />
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/analytics/searches"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voir analytics recherches
        </Link>
        <Link
          href="/dashboard/analytics/traffic"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voir analytics visites
        </Link>
        <Link
          href="/dashboard/analytics/presence"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voir analytics présence
        </Link>
        <Link
          href="/dashboard/analytics/ads"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Voir analytics monétisation
        </Link>
      </section>

      {hasError ? (
        <p className="text-sm text-amber-700">
          Certaines données n&apos;ont pas pu être chargées. Vérifie les permissions du rôle
          admin ou la disponibilité BigQuery.
        </p>
      ) : null}
    </div>
  );
}
