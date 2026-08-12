"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type UserStatusFilter = "all" | "active" | "suspended" | "archived";
type UserRoleFilter = "all" | "user" | "announcer" | "admin";
type UserPresenceFilter = "all" | "online" | "offline";

type PlatformUser = {
  uid: string;
  docId: string;
  firstname: string | null;
  lastname: string | null;
  fullName: string;
  searchableName: string | null;
  email: string | null;
  phoneNumbers: string[];
  roles: string[];
  state: string | null;
  isSuspended: boolean;
  lastSeenAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  presenceStatus: "online" | "offline";
};

type UsersPayload = {
  users: PlatformUser[];
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

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type CreateAccountPayload = {
  uid: string;
  accountType: "user" | "announcer";
  email: string;
  roles: string[];
  emailVerified: true;
  phoneNumber: string;
};

type CreateUserFormState = {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phoneNumber: string;
  countryName: string;
  countryCode: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  credits: string;
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

async function fetchUsersPage(
  filters: {
    query: string;
    role: UserRoleFilter;
    status: UserStatusFilter;
    presence: UserPresenceFilter;
  },
  cursor: string | null,
) {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (cursor) params.set("cursor", cursor);
  if (filters.query.trim()) params.set("query", filters.query.trim());
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.presence !== "all") params.set("presence", filters.presence);

  const response = await fetch(`/api/admin/v1/users?${params.toString()}`);
  const payload = (await response.json()) as
    | { success: true; data: UsersPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les utilisateurs." : payload.error?.message);
  }

  return payload.data;
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

export default function UsersPage() {
  const [queryDraft, setQueryDraft] = useState("");
  const [queryApplied, setQueryApplied] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [presence, setPresence] = useState<UserPresenceFilter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserResult, setCreateUserResult] = useState<CreateAccountPayload | null>(null);
  const [createUser, setCreateUser] = useState<CreateUserFormState>({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phoneNumber: "",
    countryName: "Gabon",
    countryCode: "GA",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    credits: "3",
  });

  const usersQuery = useInfiniteQuery({
    queryKey: ["users", "list", queryApplied, role, status, presence],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchUsersPage(
        {
          query: queryApplied,
          role,
          status,
          presence,
        },
        (pageParam ?? null) as string | null,
      ),
    getNextPageParam: (lastPage) => (lastPage.page.hasMore ? lastPage.page.nextCursor : undefined),
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  const permissions = useMemo(
    () => meQuery.data?.admin.permissions ?? [],
    [meQuery.data?.admin.permissions],
  );

  const canSuspend = useMemo(() => hasPermission(permissions, "users.suspend"), [permissions]);
  const canReactivate = useMemo(() => hasPermission(permissions, "users.reactivate"), [permissions]);
  const canCreateUser = useMemo(() => hasPermission(permissions, "users.create"), [permissions]);

  const pages = usersQuery.data?.pages ?? [];
  const safePageIndex = Math.min(currentPageIndex, Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex] ?? null;
  const users = currentPage?.users ?? [];
  const hasPrevious = safePageIndex > 0;
  const hasNextLoaded = safePageIndex < pages.length - 1;
  const hasNextRemote = currentPage?.page.hasMore ?? false;

  const totalCountLabel =
    pages.length > 0 && pages[0].totalCount !== null ? String(pages[0].totalCount) : "?";

  const stats = {
    loadedCount: users.length,
    onlineCount: users.filter((user) => user.presenceStatus === "online").length,
    offlineCount: users.filter((user) => user.presenceStatus === "offline").length,
    suspendedCount: users.filter((user) => user.isSuspended).length,
  };

  const loading = usersQuery.isLoading || meQuery.isLoading;
  const error = actionError ?? usersQuery.error?.message ?? meQuery.error?.message ?? null;

  const onSearch = useCallback(() => {
    setQueryApplied(queryDraft.trim());
    setCurrentPageIndex(0);
  }, [queryDraft]);

  const onResetFilters = useCallback(() => {
    setQueryDraft("");
    setQueryApplied("");
    setRole("all");
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
    const result = await usersQuery.fetchNextPage();
    const nextLength = result.data?.pages?.length ?? previousLength;
    if (nextLength > previousLength) {
      setCurrentPageIndex((index) => index + 1);
    }
  }, [hasNextRemote, pages.length, safePageIndex, usersQuery]);

  const onExportCsv = useCallback(() => {
    const params = new URLSearchParams();
    if (queryApplied) params.set("query", queryApplied);
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    if (presence !== "all") params.set("presence", presence);
    window.open(`/api/admin/v1/users/export?${params.toString()}`, "_blank", "noopener,noreferrer");
  }, [presence, queryApplied, role, status]);

  const onToggleSuspension = useCallback(
    async (user: PlatformUser) => {
      const targetStatus = user.isSuspended ? "active" : "suspended";
      setSubmitting(true);
      setActionError(null);
      try {
        const response = await fetch(`/api/admin/v1/users/${user.uid}/status`, {
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
        await usersQuery.refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action impossible.");
      } finally {
        setSubmitting(false);
      }
    },
    [usersQuery],
  );

  const onCreateUserAccount = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canCreateUser) {
        setCreateUserError("Permission manquante : users.create");
        return;
      }

      setCreateUserSubmitting(true);
      setCreateUserError(null);
      setCreateUserResult(null);

      try {
        const response = await fetch("/api/admin/v1/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountType: "user",
            firstname: createUser.firstname,
            lastname: createUser.lastname,
            email: createUser.email,
            password: createUser.password,
            passwordConfirm: createUser.passwordConfirm,
            phoneNumber: createUser.phoneNumber,
            country: {
              name: createUser.countryName,
              code: createUser.countryCode,
            },
            birthdate:
              createUser.birthDay && createUser.birthMonth && createUser.birthYear
                ? {
                    day: createUser.birthDay,
                    month: createUser.birthMonth,
                    year: createUser.birthYear,
                  }
                : undefined,
            credits: createUser.credits ? Number(createUser.credits) : undefined,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: CreateAccountPayload }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer le compte." : payload.error?.message);
        }

        setCreateUserResult(payload.data);
        await usersQuery.refetch();
      } catch (error) {
        setCreateUserError(error instanceof Error ? error.message : "Impossible de créer le compte.");
      } finally {
        setCreateUserSubmitting(false);
      }
    },
    [canCreateUser, createUser, usersQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Listing, recherche, présence et actions de suspension/réactivation."
        actions={
          canCreateUser ? (
            <Button type="button" variant="outline" onClick={() => setShowCreateUser((v) => !v)}>
              {showCreateUser ? "Fermer création" : "Nouveau user"}
            </Button>
          ) : null
        }
      />

      {showCreateUser ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Créer un compte utilisateur</h2>
            <p className="text-sm text-slate-600">Crée un compte `User` avec email vérifié.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={(event) => void onCreateUserAccount(event)}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={createUser.firstname}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      firstname: event.target.value,
                    }))
                  }
                  placeholder="Prénom"
                  disabled={createUserSubmitting || loading}
                />
                <Input
                  value={createUser.lastname}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      lastname: event.target.value,
                    }))
                  }
                  placeholder="Nom"
                  disabled={createUserSubmitting || loading}
                />
              </div>

              <Input
                type="email"
                value={createUser.email}
                onChange={(event) =>
                  setCreateUser((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                placeholder="Email"
                disabled={createUserSubmitting || loading}
              />

              <Input
                type="password"
                value={createUser.password}
                onChange={(event) =>
                  setCreateUser((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                placeholder="Mot de passe (8+ caractères, 1 majuscule, 1 chiffre)"
                disabled={createUserSubmitting || loading}
              />

              <Input
                type="password"
                value={createUser.passwordConfirm}
                onChange={(event) =>
                  setCreateUser((previous) => ({
                    ...previous,
                    passwordConfirm: event.target.value,
                  }))
                }
                placeholder="Confirmer le mot de passe"
                disabled={createUserSubmitting || loading}
              />

              <Input
                value={createUser.phoneNumber}
                onChange={(event) =>
                  setCreateUser((previous) => ({
                    ...previous,
                    phoneNumber: event.target.value,
                  }))
                }
                placeholder="Téléphone (ex: +24177682457)"
                disabled={createUserSubmitting || loading}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={createUser.countryName}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      countryName: event.target.value,
                    }))
                  }
                  placeholder="Pays"
                  disabled={createUserSubmitting || loading}
                />
                <Input
                  value={createUser.countryCode}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      countryCode: event.target.value,
                    }))
                  }
                  placeholder="Code pays"
                  disabled={createUserSubmitting || loading}
                />
                <Input
                  value={createUser.credits}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      credits: event.target.value,
                    }))
                  }
                  placeholder="Crédits initiaux"
                  disabled={createUserSubmitting || loading}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={createUser.birthDay}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      birthDay: event.target.value,
                    }))
                  }
                  placeholder="Jour (JJ)"
                  disabled={createUserSubmitting || loading}
                />
                <Input
                  value={createUser.birthMonth}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      birthMonth: event.target.value,
                    }))
                  }
                  placeholder="Mois (MM)"
                  disabled={createUserSubmitting || loading}
                />
                <Input
                  value={createUser.birthYear}
                  onChange={(event) =>
                    setCreateUser((previous) => ({
                      ...previous,
                      birthYear: event.target.value,
                    }))
                  }
                  placeholder="Année (AAAA)"
                  disabled={createUserSubmitting || loading}
                />
              </div>

              {createUserError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{createUserError}</p>
              ) : null}

              {createUserResult ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Compte créé: UID <span className="font-mono">{createUserResult.uid}</span> - Roles{" "}
                  <span className="font-mono">{createUserResult.roles.join(", ")}</span>
                </p>
              ) : null}

              <Button type="submit" disabled={createUserSubmitting || loading}>
                {createUserSubmitting ? "Création en cours..." : "Créer user"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_auto_auto_auto]">
            <Input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Rechercher: uid, nom, email, téléphone"
              disabled={submitting}
            />

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRoleFilter)}
              disabled={submitting}
            >
              <option value="all">Tous les rôles</option>
              <option value="user">Utilisateurs</option>
              <option value="announcer">Annonceurs</option>
              <option value="admin">Admins plateforme</option>
            </select>

            <select
              className="h-8 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
              value={status}
              onChange={(event) => setStatus(event.target.value as UserStatusFilter)}
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
              onChange={(event) => setPresence(event.target.value as UserPresenceFilter)}
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

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Liste des utilisateurs ({users.length}/{totalCountLabel}) - page {safePageIndex + 1}
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => void usersQuery.refetch()}
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
                      <th className="py-2 pr-4 font-medium">Utilisateur</th>
                      <th className="py-2 pr-4 font-medium">Rôles</th>
                      <th className="py-2 pr-4 font-medium">Statut</th>
                      <th className="py-2 pr-4 font-medium">Présence</th>
                      <th className="py-2 pr-4 font-medium">Dernière activité</th>
                      <th className="py-2 pr-4 font-medium">Inscription</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isArchived = user.state === "ARCHIVED";
                      const canToggle =
                        !isArchived &&
                        ((user.isSuspended && canReactivate) || (!user.isSuspended && canSuspend));

                      return (
                        <tr key={user.docId} className="border-b border-slate-100 align-top">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-slate-900">{user.fullName}</p>
                            <p className="text-xs text-slate-500">{user.email ?? user.uid}</p>
                            {user.phoneNumbers.length > 0 ? (
                              <p className="text-xs text-slate-500">{user.phoneNumbers[0]}</p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {user.roles.length > 0 ? user.roles.join(", ") : "Aucun"}
                          </td>
                          <td className="py-3 pr-4 text-slate-700">
                            {isArchived ? "Archivé" : user.isSuspended ? "Suspendu" : "Actif"}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={
                                user.presenceStatus === "online"
                                  ? "font-medium text-emerald-700"
                                  : "text-slate-700"
                              }
                            >
                              {user.presenceStatus === "online" ? "En ligne" : "Hors ligne"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{toDateLabel(user.lastSeenAt)}</td>
                          <td className="py-3 pr-4 text-slate-700">{toDateLabel(user.createdAt)}</td>
                          <td className="py-3 pr-4">
                            {canToggle ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={user.isSuspended ? "outline" : "destructive"}
                                onClick={() => void onToggleSuspension(user)}
                                disabled={submitting}
                              >
                                {user.isSuspended ? "Réactiver" : "Suspendre"}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">Aucune action</span>
                            )}
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
                    disabled={(!hasNextLoaded && !hasNextRemote) || usersQuery.isFetchingNextPage}
                  >
                    {usersQuery.isFetchingNextPage ? "Chargement..." : "Suivant"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
