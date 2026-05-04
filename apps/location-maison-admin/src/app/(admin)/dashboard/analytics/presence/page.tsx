"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type RangeFilter = "24h" | "7d" | "30d" | "custom";

type PresenceOnlinePayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  subject: "user" | "admin";
  summary: {
    totalSubjects: number;
    onlineSubjects: number;
    offlineSubjects: number;
  };
  records: Array<{
    subjectId: string;
    lastSeenAt: string | null;
    source: string | null;
    deviceType: string | null;
    isOnline: boolean;
  }>;
  limit: number;
};

type PresenceLastSeenPayload = {
  period: {
    range: RangeFilter;
    startAt: string;
    endAt: string;
  };
  subject: "user" | "admin";
  records: Array<{
    subjectId: string;
    lastSeenAt: string | null;
    source: string | null;
    deviceType: string | null;
    appSurface: string | null;
    isOnline: boolean;
  }>;
  page: {
    totalCount: number;
  };
};

type AdminLastLoginPayload = {
  records: Array<{
    uid: string;
    email: string;
    displayName: string | null;
    roles: string[];
    status: string;
    lastLoginAt: string | null;
    lastSeenAt: string | null;
    isOnline: boolean;
  }>;
  page: {
    totalCount: number;
  };
};

function toDateLabel(value?: string | null) {
  if (!value) {
    return "Jamais";
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

function toIsoIfPossible(value: string) {
  if (!value.trim()) {
    return "";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function onlineBadge(isOnline: boolean) {
  if (isOnline) {
    return <Badge variant="success">En ligne</Badge>;
  }
  return <Badge variant="neutral">Hors ligne</Badge>;
}

function buildRangeParams(input: {
  range: RangeFilter;
  startIso: string;
  endIso: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  params.set("range", input.range);
  if (input.limit !== undefined) {
    params.set("limit", String(input.limit));
  }
  if (input.range === "custom") {
    if (input.startIso) params.set("start", input.startIso);
    if (input.endIso) params.set("end", input.endIso);
  }
  return params;
}

async function fetchUsersOnline(input: {
  range: RangeFilter;
  startIso: string;
  endIso: string;
}) {
  const params = buildRangeParams({ ...input, limit: 200 });
  const response = await fetch(
    `/api/admin/v1/analytics/presence/users-online?${params.toString()}`,
  );
  const payload = (await response.json()) as
    | { success: true; data: PresenceOnlinePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger users-online." : payload.error?.message);
  }
  return payload.data;
}

async function fetchAdminsOnline(input: {
  range: RangeFilter;
  startIso: string;
  endIso: string;
}) {
  const params = buildRangeParams({ ...input, limit: 200 });
  const response = await fetch(
    `/api/admin/v1/analytics/presence/admins-online?${params.toString()}`,
  );
  const payload = (await response.json()) as
    | { success: true; data: PresenceOnlinePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger admins-online." : payload.error?.message);
  }
  return payload.data;
}

async function fetchUsersLastSeen(input: {
  range: RangeFilter;
  startIso: string;
  endIso: string;
}) {
  const params = buildRangeParams({ ...input, limit: 50 });
  const response = await fetch(
    `/api/admin/v1/analytics/presence/users-last-seen?${params.toString()}`,
  );
  const payload = (await response.json()) as
    | { success: true; data: PresenceLastSeenPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger users-last-seen." : payload.error?.message);
  }
  return payload.data;
}

async function fetchAdminsLastLogin() {
  const params = new URLSearchParams();
  params.set("limit", "50");

  const response = await fetch(
    `/api/admin/v1/analytics/presence/admins-last-login?${params.toString()}`,
  );
  const payload = (await response.json()) as
    | { success: true; data: AdminLastLoginPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger admins-last-login." : payload.error?.message);
  }
  return payload.data;
}

export default function AnalyticsPresencePage() {
  const [range, setRange] = useState<RangeFilter>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const customStartIso = useMemo(() => toIsoIfPossible(customStart), [customStart]);
  const customEndIso = useMemo(() => toIsoIfPossible(customEnd), [customEnd]);
  const canQuery = useMemo(() => {
    if (range !== "custom") {
      return true;
    }
    return customStartIso.length > 0 && customEndIso.length > 0;
  }, [customEndIso, customStartIso, range]);

  const usersOnlineQuery = useQuery({
    queryKey: ["analytics", "presence", "users-online", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchUsersOnline({
        range,
        startIso: customStartIso,
        endIso: customEndIso,
      }),
    enabled: canQuery,
  });

  const adminsOnlineQuery = useQuery({
    queryKey: ["analytics", "presence", "admins-online", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchAdminsOnline({
        range,
        startIso: customStartIso,
        endIso: customEndIso,
      }),
    enabled: canQuery,
  });

  const usersLastSeenQuery = useQuery({
    queryKey: ["analytics", "presence", "users-last-seen", range, customStartIso, customEndIso],
    queryFn: () =>
      fetchUsersLastSeen({
        range,
        startIso: customStartIso,
        endIso: customEndIso,
      }),
    enabled: canQuery,
  });

  const adminsLastLoginQuery = useQuery({
    queryKey: ["analytics", "presence", "admins-last-login"],
    queryFn: fetchAdminsLastLogin,
  });

  const loading =
    usersOnlineQuery.isLoading ||
    adminsOnlineQuery.isLoading ||
    usersLastSeenQuery.isLoading ||
    adminsLastLoginQuery.isLoading;

  const error =
    usersOnlineQuery.error?.message ||
    adminsOnlineQuery.error?.message ||
    usersLastSeenQuery.error?.message ||
    adminsLastLoginQuery.error?.message ||
    null;

  const usersOnline = usersOnlineQuery.data;
  const adminsOnline = adminsOnlineQuery.data;
  const usersLastSeen = usersLastSeenQuery.data;
  const adminsLastLogin = adminsLastLoginQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics présence"
        description="Suivi de la présence utilisateurs/admins et dernière activité."
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void usersOnlineQuery.refetch();
              void adminsOnlineQuery.refetch();
              void usersLastSeenQuery.refetch();
              void adminsLastLoginQuery.refetch();
            }}
            disabled={loading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Période</h2>
          <p className="text-sm text-slate-600">Par défaut: 7 derniers jours.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-4">
            <select
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={range}
              onChange={(event) => setRange(event.target.value as RangeFilter)}
            >
              <option value="24h">24 heures</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>

          {range === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="datetime-local"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
              />
              <Input
                type="datetime-local"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Utilisateurs en ligne</p>
            <p className="text-2xl font-semibold text-emerald-700">
              {usersOnline?.summary.onlineSubjects ?? 0}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Utilisateurs hors ligne</p>
            <p className="text-2xl font-semibold text-slate-900">
              {usersOnline?.summary.offlineSubjects ?? 0}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Admins en ligne</p>
            <p className="text-2xl font-semibold text-emerald-700">
              {adminsOnline?.summary.onlineSubjects ?? 0}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Admins hors ligne</p>
            <p className="text-2xl font-semibold text-slate-900">
              {adminsOnline?.summary.offlineSubjects ?? 0}
            </p>
          </CardHeader>
        </Card>
      </section>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Utilisateurs actuellement en ligne</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">UID</th>
                      <th className="py-2 pr-4 font-medium">Dernière activité</th>
                      <th className="py-2 pr-4 font-medium">Device</th>
                      <th className="py-2 pr-4 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersOnline?.records.length ? (
                      usersOnline.records.map((row) => (
                        <tr key={row.subjectId} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-xs text-slate-700">{row.subjectId}</td>
                          <td className="py-2 pr-4 text-slate-700">{toDateLabel(row.lastSeenAt)}</td>
                          <td className="py-2 pr-4 text-slate-700">{row.deviceType || "-"}</td>
                          <td className="py-2 pr-4 text-slate-700">{row.source || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                          Aucun utilisateur en ligne.
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
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Admins actuellement en ligne</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">UID</th>
                      <th className="py-2 pr-4 font-medium">Dernière activité</th>
                      <th className="py-2 pr-4 font-medium">Device</th>
                      <th className="py-2 pr-4 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsOnline?.records.length ? (
                      adminsOnline.records.map((row) => (
                        <tr key={row.subjectId} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-xs text-slate-700">{row.subjectId}</td>
                          <td className="py-2 pr-4 text-slate-700">{toDateLabel(row.lastSeenAt)}</td>
                          <td className="py-2 pr-4 text-slate-700">{row.deviceType || "-"}</td>
                          <td className="py-2 pr-4 text-slate-700">{row.source || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                          Aucun admin en ligne.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Dernière activité utilisateurs</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">UID</th>
                      <th className="py-2 pr-4 font-medium">Statut</th>
                      <th className="py-2 pr-4 font-medium">Last seen</th>
                      <th className="py-2 pr-4 font-medium">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLastSeen?.records.length ? (
                      usersLastSeen.records.map((row) => (
                        <tr key={row.subjectId} className="border-b border-slate-100">
                          <td className="py-2 pr-4 text-xs text-slate-700">{row.subjectId}</td>
                          <td className="py-2 pr-4">{onlineBadge(row.isOnline)}</td>
                          <td className="py-2 pr-4 text-slate-700">{toDateLabel(row.lastSeenAt)}</td>
                          <td className="py-2 pr-4 text-slate-700">{row.deviceType || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                          Aucune donnée de présence utilisateur.
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
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Dernière connexion admins</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4 font-medium">Admin</th>
                      <th className="py-2 pr-4 font-medium">Statut</th>
                      <th className="py-2 pr-4 font-medium">Rôle(s)</th>
                      <th className="py-2 pr-4 font-medium">Dernière connexion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsLastLogin?.records.length ? (
                      adminsLastLogin.records.map((row) => (
                        <tr key={row.uid} className="border-b border-slate-100">
                          <td className="py-2 pr-4">
                            <p className="font-medium text-slate-900">{row.displayName || row.email}</p>
                            <p className="text-xs text-slate-500">{row.uid}</p>
                          </td>
                          <td className="py-2 pr-4">{onlineBadge(row.isOnline)}</td>
                          <td className="py-2 pr-4 text-xs text-slate-700">{row.roles.join(", ") || "-"}</td>
                          <td className="py-2 pr-4 text-slate-700">{toDateLabel(row.lastLoginAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-slate-500">
                          Aucune donnée de connexion admin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
