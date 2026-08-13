"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";
import { ADMIN_ROLES } from "@/modules/iam/domain/role-utils";
import type { AdminRole, AdminStatus } from "@/modules/iam/domain/types";

type PresenceStatus = "online" | "offline";

type AdminRow = {
  uid: string;
  email: string;
  displayName: string | null;
  status: AdminStatus;
  roles: AdminRole[];
  presenceStatus: PresenceStatus;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
};

type AdminListPayload = {
  admins: AdminRow[];
  count: number;
  onlineCount: number;
  offlineCount: number;
};

type AuthMePayload = {
  admin: {
    uid: string;
    permissions: string[];
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

function toPresenceLabel(status: PresenceStatus) {
  return status === "online" ? "En ligne" : "Hors ligne";
}

function toStatusLabel(status: AdminStatus) {
  if (status === "active") return "Actif";
  if (status === "suspended") return "Suspendu";
  if (status === "invited") return "Invité";
  return "Révoqué";
}

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

async function fetchAdmins() {
  const response = await fetch("/api/admin/v1/admins");
  const payload = (await response.json()) as
    | { success: true; data: AdminListPayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger les admins." : payload.error?.message);
  }

  return payload.data;
}

async function fetchMe() {
  const response = await fetch("/api/admin/v1/auth/me");
  const payload = (await response.json()) as
    | { success: true; data: AuthMePayload }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Impossible de charger vos permissions." : payload.error?.message);
  }

  return payload.data;
}

export default function AdminsPage() {
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("analyst_admin");
  const [roleDraftByAdminId, setRoleDraftByAdminId] = useState<Record<string, AdminRole>>({});

  const adminsQuery = useQuery({
    queryKey: ["admins", "list"],
    queryFn: fetchAdmins,
  });

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
  });

  const permissions = useMemo(
    () => meQuery.data?.admin.permissions ?? [],
    [meQuery.data?.admin.permissions],
  );
  const actorUid = meQuery.data?.admin.uid ?? "";
  const admins = adminsQuery.data?.admins ?? [];
  const stats = {
    count: adminsQuery.data?.count ?? 0,
    onlineCount: adminsQuery.data?.onlineCount ?? 0,
    offlineCount: adminsQuery.data?.offlineCount ?? 0,
  };

  const loading = adminsQuery.isLoading || meQuery.isLoading;
  const error = actionError ?? adminsQuery.error?.message ?? meQuery.error?.message ?? null;

  const canInvite = useMemo(() => hasPermission(permissions, "admins.invite"), [permissions]);
  const canUpdateRole = useMemo(
    () => hasPermission(permissions, "admins.update_role"),
    [permissions],
  );
  const canChangeStatus = useMemo(
    () => hasPermission(permissions, "admins.suspend"),
    [permissions],
  );
  const canRevoke = useMemo(() => hasPermission(permissions, "admins.revoke"), [permissions]);

  const refreshAdmins = useCallback(async () => {
    await adminsQuery.refetch();
  }, [adminsQuery]);

  const withMutation = useCallback(
    async (task: () => Promise<void>) => {
      setSubmitting(true);
      setActionError(null);
      try {
        await task();
        await adminsQuery.refetch();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Action impossible.");
      } finally {
        setSubmitting(false);
      }
    },
    [adminsQuery],
  );

  const handleInvite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) {
      setActionError("Renseignez un email avant d'inviter.");
      return;
    }

    await withMutation(async () => {
      const response = await fetch("/api/admin/v1/admins/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: inviteRole,
        }),
      });

      const payload = (await response.json()) as
        | { success: true }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Invitation impossible." : payload.error?.message);
      }

      setInviteEmail("");
      setInviteRole("analyst_admin");
    });
  }, [inviteEmail, inviteRole, withMutation]);

  const handleRoleUpdate = useCallback(
    async (uid: string, fallbackRole: AdminRole) => {
      const role = roleDraftByAdminId[uid] ?? fallbackRole;

      await withMutation(async () => {
        const response = await fetch(`/api/admin/v1/admins/${uid}/roles`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roles: [role],
          }),
        });

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Mise à jour des rôles impossible." : payload.error?.message);
        }
      });
    },
    [roleDraftByAdminId, withMutation],
  );

  const handleStatusUpdate = useCallback(
    async (uid: string, nextStatus: Extract<AdminStatus, "active" | "suspended">) => {
      await withMutation(async () => {
        const response = await fetch(`/api/admin/v1/admins/${uid}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        });

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Changement de statut impossible." : payload.error?.message);
        }
      });
    },
    [withMutation],
  );

  const handleRevoke = useCallback(
    async (uid: string) => {
      await withMutation(async () => {
        const response = await fetch(`/api/admin/v1/admins/${uid}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as
          | { success: true }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Révocation impossible." : payload.error?.message);
        }
      });
    },
    [withMutation],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrateurs"
        description="Gestion des accès admin, des rôles et du statut de présence."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Total admins</p>
            <p className="text-2xl font-semibold text-foreground">{stats.count}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">En ligne</p>
            <p className="text-2xl font-semibold text-success">{stats.onlineCount}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">Hors ligne</p>
            <p className="text-2xl font-semibold text-foreground">{stats.offlineCount}</p>
          </CardHeader>
        </Card>
      </section>

      {canInvite ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-foreground">Inviter un admin</h2>
            <p className="text-sm text-muted-foreground">Création ou mise à jour d&apos;un accès administrateur.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                disabled={submitting}
              />
              <select
                className="h-8 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as AdminRole)}
                disabled={submitting}
              >
                {ADMIN_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => void handleInvite()} disabled={submitting}>
                Inviter
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Liste des admins</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshAdmins()}
            disabled={loading || submitting}
          >
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Admin</th>
                    <th className="py-2 pr-4 font-medium">Rôle</th>
                    <th className="py-2 pr-4 font-medium">Statut</th>
                    <th className="py-2 pr-4 font-medium">Présence</th>
                    <th className="py-2 pr-4 font-medium">Dernière activité</th>
                    <th className="py-2 pr-4 font-medium">Dernière connexion</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => {
                    const canMutateRow = admin.uid !== actorUid;
                    const roleFallback = admin.roles[0] ?? "analyst_admin";
                    const roleDraft = roleDraftByAdminId[admin.uid] ?? roleFallback;
                    const isSuspended = admin.status === "suspended";
                    const canToggleStatus = canChangeStatus && canMutateRow && admin.status !== "revoked";

                    return (
                      <tr key={admin.uid} className="border-b border-border align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{admin.displayName || admin.email}</p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          {canUpdateRole && canMutateRow ? (
                            <div className="flex items-center gap-2">
                              <select
                                className="h-8 min-w-[180px] rounded-lg border border-border bg-card px-2 text-sm"
                                value={roleDraft}
                                onChange={(event) =>
                                  setRoleDraftByAdminId((current) => ({
                                    ...current,
                                    [admin.uid]: event.target.value as AdminRole,
                                  }))
                                }
                                disabled={submitting}
                              >
                                {ADMIN_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleRoleUpdate(admin.uid, roleFallback)}
                                disabled={submitting}
                              >
                                Enregistrer
                              </Button>
                            </div>
                          ) : (
                            <span className="text-foreground">{admin.roles.join(", ") || "Aucun rôle"}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-foreground">{toStatusLabel(admin.status)}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              admin.presenceStatus === "online"
                                ? "font-medium text-success"
                                : "text-foreground"
                            }
                          >
                            {toPresenceLabel(admin.presenceStatus)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-foreground">{toDateLabel(admin.lastSeenAt)}</td>
                        <td className="py-3 pr-4 text-foreground">{toDateLabel(admin.lastLoginAt)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-2">
                            {canToggleStatus ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleStatusUpdate(admin.uid, isSuspended ? "active" : "suspended")
                                }
                                disabled={submitting}
                              >
                                {isSuspended ? "Réactiver" : "Suspendre"}
                              </Button>
                            ) : null}
                            {canRevoke && canMutateRow && admin.status !== "revoked" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => void handleRevoke(admin.uid)}
                                disabled={submitting}
                              >
                                Révoquer
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
