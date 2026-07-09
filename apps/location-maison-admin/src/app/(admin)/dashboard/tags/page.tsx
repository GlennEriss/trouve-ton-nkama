"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type TagItem = {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
  updatedAt: string | null;
};

type TagsPayload = {
  tags: TagItem[];
  count: number;
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
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function TagsDashboardPage() {
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createOrder, setCreateOrder] = useState("0");
  const [createActive, setCreateActive] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [editTargetId, setEditTargetId] = useState("");
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editActive, setEditActive] = useState<"unchanged" | "true" | "false">("unchanged");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingTagId, setIsDeletingTagId] = useState<string | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadTags = useMemo(() => hasPermission(permissions, "listings.read"), [permissions]);
  const canManageTags = useMemo(() => hasPermission(permissions, "listings.update"), [permissions]);

  const tagsQuery = useQuery({
    queryKey: ["dashboard", "tags"],
    queryFn: () => fetchJson<TagsPayload>("/api/admin/v1/tags", "Impossible de charger les tags."),
    enabled: canReadTags,
  });

  const tags = tagsQuery.data?.tags ?? [];
  const activeCount = tags.filter((tag) => tag.isActive).length;

  const refreshAll = useCallback(async () => {
    await Promise.all([permissionsQuery.refetch(), tagsQuery.refetch()]);
  }, [permissionsQuery, tagsQuery]);

  const resetCreateForm = useCallback(() => {
    setCreateName("");
    setCreateOrder("0");
    setCreateActive(true);
  }, []);

  const resetEditForm = useCallback(() => {
    setEditTargetId("");
    setEditName("");
    setEditOrder("");
    setEditActive("unchanged");
  }, []);

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageTags) {
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsCreating(true);
      try {
        const order = Number(createOrder || "0");
        if (!Number.isFinite(order) || order < 0) {
          throw new Error("L'ordre du tag est invalide.");
        }

        const response = await fetch("/api/admin/v1/tags", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: createName,
            order,
            isActive: createActive,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: { tag: TagItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer ce tag." : payload.error?.message);
        }

        setGlobalMessage(`Tag créé: ${payload.data.tag.name}.`);
        resetCreateForm();
        await tagsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer ce tag.");
      } finally {
        setIsCreating(false);
      }
    },
    [canManageTags, createActive, createName, createOrder, resetCreateForm, tagsQuery],
  );

  const handleUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageTags) {
        return;
      }
      if (!editTargetId.trim()) {
        setGlobalError("Sélectionne un tag à modifier.");
        return;
      }

      const patch: Record<string, unknown> = {};
      if (editName.trim()) patch.name = editName.trim();
      if (editOrder.trim()) {
        const parsed = Number(editOrder.trim());
        if (!Number.isFinite(parsed) || parsed < 0) {
          setGlobalError("L'ordre est invalide.");
          return;
        }
        patch.order = parsed;
      }
      if (editActive !== "unchanged") {
        patch.isActive = editActive === "true";
      }

      if (Object.keys(patch).length === 0) {
        setGlobalError("Aucun changement détecté.");
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/admin/v1/tags/${encodeURIComponent(editTargetId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(patch),
        });

        const payload = (await response.json()) as
          | { success: true; data: { tag: TagItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de mettre à jour ce tag." : payload.error?.message);
        }

        setGlobalMessage(`Tag mis à jour: ${payload.data.tag.name}.`);
        resetEditForm();
        await tagsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de mettre à jour ce tag.");
      } finally {
        setIsUpdating(false);
      }
    },
    [canManageTags, editActive, editName, editOrder, editTargetId, resetEditForm, tagsQuery],
  );

  const handleDelete = useCallback(
    async (tagId: string) => {
      if (!canManageTags) {
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsDeletingTagId(tagId);
      try {
        const response = await fetch(`/api/admin/v1/tags/${encodeURIComponent(tagId)}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as
          | { success: true; data: { tag: TagItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de supprimer ce tag." : payload.error?.message);
        }

        setGlobalMessage(`Tag supprimé: ${payload.data.tag.name}.`);
        if (editTargetId === tagId) {
          resetEditForm();
        }
        await tagsQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de supprimer ce tag.");
      } finally {
        setIsDeletingTagId(null);
      }
    },
    [canManageTags, editTargetId, resetEditForm, tagsQuery],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags annonces"
        description="Gestion des tags utilisés dans le formulaire annonces et les filtres de recherche."
        actions={
          <Button variant="outline" onClick={() => void refreshAll()} disabled={permissionsQuery.isFetching || tagsQuery.isFetching}>
            Actualiser
          </Button>
        }
      />

      {globalError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{globalError}</p> : null}
      {globalMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{globalMessage}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 text-sm text-slate-500">Total tags</CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{tagsQuery.data?.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 text-sm text-slate-500">Tags actifs</CardHeader>
          <CardContent className="text-2xl font-semibold text-slate-900">{activeCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Créer un tag</h2>
            <p className="text-sm text-slate-500">Permission requise: <code>listings.update</code></p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleCreate}>
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Nom du tag (ex: Vue mer)"
                disabled={!canManageTags || isCreating}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  value={createOrder}
                  onChange={(event) => setCreateOrder(event.target.value)}
                  placeholder="Ordre"
                  disabled={!canManageTags || isCreating}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createActive ? "true" : "false"}
                  onChange={(event) => setCreateActive(event.target.value === "true")}
                  disabled={!canManageTags || isCreating}
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
              <Button type="submit" disabled={!canManageTags || isCreating || !createName.trim()}>
                {isCreating ? "Création..." : "Créer le tag"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Modifier un tag</h2>
            <p className="text-sm text-slate-500">Laisse un champ vide si inchangé.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editTargetId}
                onChange={(event) => setEditTargetId(event.target.value)}
                disabled={!canManageTags || isUpdating}
              >
                <option value="">Sélectionne un tag</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Nouveau nom"
                disabled={!canManageTags || isUpdating}
              />
              <Input
                type="number"
                min={0}
                value={editOrder}
                onChange={(event) => setEditOrder(event.target.value)}
                placeholder="Nouvel ordre"
                disabled={!canManageTags || isUpdating}
              />
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editActive}
                onChange={(event) => setEditActive(event.target.value as "unchanged" | "true" | "false")}
                disabled={!canManageTags || isUpdating}
              >
                <option value="unchanged">Statut inchangé</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
              <Button type="submit" disabled={!canManageTags || isUpdating || !editTargetId}>
                {isUpdating ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Liste des tags</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {permissionsQuery.isLoading || tagsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Chargement des tags...</p>
          ) : null}
          {tagsQuery.error ? (
            <p className="text-sm text-red-600">{tagsQuery.error.message}</p>
          ) : null}
          {!tagsQuery.isLoading && !tagsQuery.error ? (
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Actif</th>
                  <th className="px-3 py-2">Ordre</th>
                  <th className="px-3 py-2">Màj</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-t">
                    <td className="px-3 py-2 font-medium text-slate-900">{tag.name}</td>
                    <td className="px-3 py-2">{tag.isActive ? "Oui" : "Non"}</td>
                    <td className="px-3 py-2">{tag.order}</td>
                    <td className="px-3 py-2">{toDateLabel(tag.updatedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!canManageTags || isDeletingTagId === tag.id}
                        onClick={() => void handleDelete(tag.id)}
                      >
                        {isDeletingTagId === tag.id ? "Suppression..." : "Supprimer"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {tags.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                      Aucun tag configuré.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
