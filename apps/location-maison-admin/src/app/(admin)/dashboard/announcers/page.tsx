"use client";

import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type AnnouncerStatusFilter = "all" | "active" | "suspended" | "archived";
type AnnouncerPresenceFilter = "all" | "online" | "offline";

type AnnouncerListItem = {
  uid: string;
  fullName: string;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  presenceStatus: "online" | "offline";
  isSuspended: boolean;
  state: string | null;
  announcerSinceAt: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
};

type AnnouncerListPayload = {
  announcers: AnnouncerListItem[];
  count: number;
  totalCount: number | null;
  onlineCount: number;
  offlineCount: number;
  suspendedCount: number;
  page: {
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

type AnnouncerDetails = {
  uid: string;
  docId: string;
  fullName: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  state: string | null;
  isSuspended: boolean;
  presenceStatus: "online" | "offline";
  lastSeenAt: string | null;
  announcerSinceAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown> | null;
};

type AnnouncerDetailsPayload = {
  announcer: AnnouncerDetails;
};

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

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

async function fetchAnnouncersPage(
  filters: {
    query: string;
    status: AnnouncerStatusFilter;
    presence: AnnouncerPresenceFilter;
  },
  cursor: string | null,
) {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (cursor) params.set("cursor", cursor);
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.presence !== "all") params.set("presence", filters.presence);

  const response = await fetch(`/api/admin/v1/announcers?${params.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: AnnouncerListPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les annonceurs." : payload.error?.message);
  }

  return payload.data;
}

async function fetchAnnouncerDetails(uid: string) {
  const response = await fetch(`/api/admin/v1/announcers/${uid}`);
  const payload = (await response.json()) as
    | { success: true; data: AnnouncerDetailsPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger le détail annonceur." : payload.error?.message);
  }

  return payload.data.announcer;
}

async function fetchMe() {
  const response = await fetch("/api/admin/v1/auth/me");
  const payload = (await response.json()) as
    | { success: true; data: AuthMePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les permissions." : payload.error?.message);
  }

  return payload.data;
}

export default function AnnouncersPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [status, setStatus] = useState<AnnouncerStatusFilter>("all");
  const [presence, setPresence] = useState<AnnouncerPresenceFilter>("all");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const announcersQuery = useInfiniteQuery({
    queryKey: ["announcers", "list", queryApplied, status, presence],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchAnnouncersPage(
        {
          query: queryApplied,
          status,
          presence,
        },
        (pageParam ?? null) as string | null,
      ),
    getNextPageParam: (lastPage) => (lastPage.page.hasMore ? lastPage.page.nextCursor : undefined),
  });

  const detailsQuery = useQuery({
    queryKey: ["announcers", "details", selectedUid],
    queryFn: () => fetchAnnouncerDetails(selectedUid as string),
    enabled: Boolean(selectedUid),
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  const permissions = useMemo(
    () => meQuery.data?.admin.permissions ?? [],
    [meQuery.data?.admin.permissions],
  );
  const canUpdateAnnouncer = useMemo(
    () => hasPermission(permissions, "announcers.update"),
    [permissions],
  );

  const pages = announcersQuery.data?.pages ?? [];
  const safePageIndex = Math.min(currentPageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] ?? null;
  const announcers = currentPage?.announcers ?? [];
  const hasPrevious = safePageIndex > 0;
  const hasNextLoaded = safePageIndex < pages.length - 1;
  const hasNextRemote = currentPage?.page.hasMore ?? false;

  const totalCountLabel =
    pages.length > 0 && pages[0].totalCount !== null ? String(pages[0].totalCount) : "?";

  const stats = {
    loadedCount: announcers.length,
    onlineCount: announcers.filter((announcer) => announcer.presenceStatus === "online").length,
    offlineCount: announcers.filter((announcer) => announcer.presenceStatus === "offline").length,
    suspendedCount: announcers.filter((announcer) => announcer.isSuspended).length,
  };

  const loading = announcersQuery.isLoading || meQuery.isLoading;
  const error = actionError ?? announcersQuery.error?.message ?? meQuery.error?.message ?? null;

  const onSearch = useCallback(() => {
    setQueryApplied(queryDraft.trim());
    setCurrentPageIndex(0);
  }, [queryDraft]);

  const onResetFilters = useCallback(() => {
    setQueryDraft("");
    setQueryApplied("");
    setStatus("all");
    setPresence("all");
    setCurrentPageIndex(0);
  }, []);

  const onPreviousPage = useCallback(() => {
    setCurrentPageIndex((index) => Math.max(0, index - 1));
  }, []);

  const onNextPage = useCallback(async () => {
    if (safePageIndex < pages.length - 1) {
      setCurrentPageIndex((index) => index + 1);
      return;
    }

    if (!hasNextRemote) {
      return;
    }

    const previousLength = pages.length;
    const result = await announcersQuery.fetchNextPage();
    const nextLength = result.data?.pages?.length ?? previousLength;
    if (nextLength > previousLength) {
      setCurrentPageIndex((index) => index + 1);
    }
  }, [announcersQuery, hasNextRemote, pages.length, safePageIndex]);

  const onExportCsv = useCallback(() => {
    const params = new URLSearchParams();
    if (queryApplied) params.set("query", queryApplied);
    if (status !== "all") params.set("status", status);
    if (presence !== "all") params.set("presence", presence);
    window.open(
      `/api/admin/v1/announcers/export?${params.toString()}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [presence, queryApplied, status]);

  const onToggleSuspension = useCallback(
    async (announcer: AnnouncerListItem) => {
      const targetStatus = announcer.isSuspended ? "active" : "suspended";
      setSubmitting(true);
      setActionError(null);
      try {
        const response = await fetch(`/api/admin/v1/announcers/${announcer.uid}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: targetStatus,
          }),
        });
        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Action impossible." : payload.error?.message);
        }

        await announcersQuery.refetch();
        if (selectedUid === announcer.uid) {
          await detailsQuery.refetch();
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action impossible.");
      } finally {
        setSubmitting(false);
      }
    },
    [announcersQuery, detailsQuery, selectedUid],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Annonceurs"
        description="Consultation des comptes annonceurs, présence et statut opérationnel."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Page courante</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.loadedCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">En ligne</p>
            <p className="text-2xl font-semibold text-emerald-700">{stats.onlineCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Suspendus</p>
            <p className="text-2xl font-semibold text-amber-700">{stats.suspendedCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-slate-600">Hors ligne</p>
            <p className="text-2xl font-semibold text-slate-900">{stats.offlineCount}</p>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">Filtres</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto_auto_auto]">
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Rechercher: uid, nom, email, téléphone"
              disabled={submitting}
            />

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={status}
              onChange={(event) => setStatus(event.target.value as AnnouncerStatusFilter)}
              disabled={submitting}
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="archived">Archivés</option>
            </select>

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={presence}
              onChange={(event) => setPresence(event.target.value as AnnouncerPresenceFilter)}
              disabled={submitting}
            >
              <option value="all">Toute présence</option>
              <option value="online">En ligne</option>
              <option value="offline">Hors ligne</option>
            </select>

            <Button type="button" onClick={onSearch} disabled={submitting}>
              Rechercher
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilters} disabled={submitting}>
              Réinitialiser
            </Button>
            <Button type="button" variant="outline" onClick={onExportCsv} disabled={loading || submitting}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Liste des annonceurs ({announcers.length}/{totalCountLabel}) - page {safePageIndex + 1}
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => void announcersQuery.refetch()}
              disabled={loading || submitting}
            >
              Actualiser
            </Button>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="py-2 pr-4 font-medium">Annonceur</th>
                        <th className="py-2 pr-4 font-medium">Statut</th>
                        <th className="py-2 pr-4 font-medium">Présence</th>
                        <th className="py-2 pr-4 font-medium">Depuis</th>
                        <th className="py-2 pr-4 font-medium">Dernière activité</th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcers.map((announcer) => {
                        const isArchived = announcer.state === "ARCHIVED";
                        return (
                          <tr key={announcer.uid} className="border-b border-slate-100 align-top">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-slate-900">{announcer.fullName}</p>
                              <p className="text-xs text-slate-500">{announcer.email ?? announcer.uid}</p>
                              {announcer.phoneNumbers.length > 0 ? (
                                <p className="text-xs text-slate-500">{announcer.phoneNumbers[0]}</p>
                              ) : null}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {isArchived ? "Archivé" : announcer.isSuspended ? "Suspendu" : "Actif"}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={
                                  announcer.presenceStatus === "online"
                                    ? "font-medium text-emerald-700"
                                    : "text-slate-700"
                                }
                              >
                                {announcer.presenceStatus === "online" ? "En ligne" : "Hors ligne"}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {toDateLabel(announcer.announcerSinceAt)}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">
                              {toDateLabel(announcer.lastSeenAt)}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedUid(announcer.uid)}
                                  disabled={submitting}
                                >
                                  Consulter
                                </Button>
                                {canUpdateAnnouncer && !isArchived ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={announcer.isSuspended ? "outline" : "destructive"}
                                    onClick={() => void onToggleSuspension(announcer)}
                                    disabled={submitting}
                                  >
                                    {announcer.isSuspended ? "Réactiver" : "Suspendre"}
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <p>
                    Debug curseur: courant=
                    <code>{currentPage?.page.cursor ?? "null"}</code> | suivant=
                    <code>{currentPage?.page.nextCursor ?? "null"}</code> | hasMore=
                    <code>{String(currentPage?.page.hasMore ?? false)}</code>
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onPreviousPage} disabled={!hasPrevious}>
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onNextPage()}
                      disabled={(!hasNextLoaded && !hasNextRemote) || announcersQuery.isFetchingNextPage}
                    >
                      {announcersQuery.isFetchingNextPage ? "Chargement..." : "Suivant"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Profil annonceur</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedUid ? (
              <p className="text-sm text-slate-600">Sélectionnez un annonceur pour voir ses détails.</p>
            ) : detailsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Chargement du profil...</p>
            ) : detailsQuery.error ? (
              <p className="text-sm text-red-700">{detailsQuery.error.message}</p>
            ) : detailsQuery.data ? (
              <>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Nom:</span> {detailsQuery.data.fullName}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Email:</span> {detailsQuery.data.email ?? "Non renseigné"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">UID:</span> {detailsQuery.data.uid}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Rôles:</span>{" "}
                  {detailsQuery.data.roles.length ? detailsQuery.data.roles.join(", ") : "Aucun"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Présence:</span>{" "}
                  {detailsQuery.data.presenceStatus === "online" ? "En ligne" : "Hors ligne"}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Dernière activité:</span>{" "}
                  {toDateLabel(detailsQuery.data.lastSeenAt)}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Annonceur depuis:</span>{" "}
                  {toDateLabel(detailsQuery.data.announcerSinceAt)}
                </p>
                <p className="text-sm text-slate-900">
                  <span className="font-medium">Création:</span> {toDateLabel(detailsQuery.data.createdAt)}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
