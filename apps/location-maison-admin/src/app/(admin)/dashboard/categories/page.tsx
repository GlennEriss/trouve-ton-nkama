"use client";

import { Fragment, FormEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { PageHeader } from "@/components/ui-kit/page-header";

type AuthMePayload = {
  admin: {
    permissions: string[];
  };
};

type AttributeSchemaField = {
  key: string;
  label: string;
  type: "text" | "number" | "enum" | "boolean";
  options?: string[];
  required: boolean;
  facetable: boolean;
  searchable: boolean;
  showOnCard: boolean;
  primary: boolean;
};

type CategoryItem = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
  isActive: boolean;
  attributeSchema: AttributeSchemaField[];
  imageRatio: "4:3" | "1:1" | "4:5";
  locationPrecision: "exact" | "city" | "none";
  hasMapView: boolean;
  defaultDensity: "showcase" | "standard" | "compact";
  defaultSort: string;
  minListingsForHomeSection: number;
  updatedAt: string | null;
};

type CategoriesPayload = {
  categories: CategoryItem[];
  count: number;
};

const IMAGE_RATIOS = ["4:3", "1:1", "4:5"] as const;
const LOCATION_PRECISIONS = ["exact", "city", "none"] as const;
const LOCATION_PRECISION_LABELS: Record<(typeof LOCATION_PRECISIONS)[number], string> = {
  exact: "Localisation exacte",
  city: "Ville seule",
  none: "Sans localisation",
};
const DENSITIES = ["showcase", "standard", "compact"] as const;

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

function buildTree(categories: CategoryItem[]) {
  const roots = categories.filter((category) => category.parentId === null);
  const childrenByParent = new Map<string, CategoryItem[]>();
  for (const category of categories) {
    if (category.parentId === null) continue;
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parentId, siblings);
  }
  return { roots, childrenByParent };
}

export default function CategoriesDashboardPage() {
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [createParentId, setCreateParentId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createIcon, setCreateIcon] = useState("");
  const [createOrder, setCreateOrder] = useState("0");
  const [createActive, setCreateActive] = useState(false);
  const [createImageRatio, setCreateImageRatio] = useState<(typeof IMAGE_RATIOS)[number]>("4:3");
  const [createLocationPrecision, setCreateLocationPrecision] = useState<(typeof LOCATION_PRECISIONS)[number]>("city");
  const [createHasMapView, setCreateHasMapView] = useState(false);
  const [createDensity, setCreateDensity] = useState<(typeof DENSITIES)[number]>("standard");
  const [createMinListings, setCreateMinListings] = useState("12");
  const [createAttributeSchema, setCreateAttributeSchema] = useState("[]");
  const [isCreating, setIsCreating] = useState(false);

  const [editTargetId, setEditTargetId] = useState("");
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editActive, setEditActive] = useState<"unchanged" | "true" | "false">("unchanged");
  const [editHasMapView, setEditHasMapView] = useState<"unchanged" | "true" | "false">("unchanged");
  const [editMinListings, setEditMinListings] = useState("");
  const [editAttributeSchema, setEditAttributeSchema] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingCategoryId, setIsDeletingCategoryId] = useState<string | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });

  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canReadCategories = useMemo(() => hasPermission(permissions, "categories.read"), [permissions]);
  const canManageCategories = useMemo(() => hasPermission(permissions, "categories.manage"), [permissions]);

  const categoriesQuery = useQuery({
    queryKey: ["dashboard", "categories"],
    queryFn: () =>
      fetchJson<CategoriesPayload>("/api/admin/v1/categories", "Impossible de charger les catégories."),
    enabled: canReadCategories,
  });

  const categories = categoriesQuery.data?.categories ?? [];
  const { roots, childrenByParent } = useMemo(() => buildTree(categories), [categories]);
  const activeCount = categories.filter((category) => category.isActive).length;

  const refreshAll = useCallback(async () => {
    await Promise.all([permissionsQuery.refetch(), categoriesQuery.refetch()]);
  }, [permissionsQuery, categoriesQuery]);

  const resetCreateForm = useCallback(() => {
    setCreateParentId("");
    setCreateName("");
    setCreateSlug("");
    setCreateIcon("");
    setCreateOrder("0");
    setCreateActive(false);
    setCreateImageRatio("4:3");
    setCreateLocationPrecision("city");
    setCreateHasMapView(false);
    setCreateDensity("standard");
    setCreateMinListings("12");
    setCreateAttributeSchema("[]");
  }, []);

  const resetEditForm = useCallback(() => {
    setEditTargetId("");
    setEditName("");
    setEditOrder("");
    setEditActive("unchanged");
    setEditHasMapView("unchanged");
    setEditMinListings("");
    setEditAttributeSchema("");
  }, []);

  const handleCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageCategories) {
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsCreating(true);
      try {
        const order = Number(createOrder || "0");
        if (!Number.isFinite(order) || order < 0) {
          throw new Error("L'ordre de la catégorie est invalide.");
        }
        const minListings = Number(createMinListings || "0");
        if (!Number.isFinite(minListings) || minListings < 0) {
          throw new Error("Le seuil d'affichage accueil est invalide.");
        }

        let attributeSchema: unknown;
        try {
          attributeSchema = JSON.parse(createAttributeSchema || "[]");
        } catch {
          throw new Error("Le schéma d'attributs n'est pas un JSON valide.");
        }
        if (!Array.isArray(attributeSchema)) {
          throw new Error("Le schéma d'attributs doit être un tableau JSON.");
        }

        const response = await fetch("/api/admin/v1/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: createParentId || null,
            name: createName,
            slug: createSlug.trim() || undefined,
            icon: createIcon.trim() || null,
            order,
            isActive: createActive,
            imageRatio: createImageRatio,
            locationPrecision: createLocationPrecision,
            hasMapView: createHasMapView,
            defaultDensity: createDensity,
            minListingsForHomeSection: minListings,
            attributeSchema,
          }),
        });

        const payload = (await response.json()) as
          | { success: true; data: { category: CategoryItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer cette catégorie." : payload.error?.message);
        }

        setGlobalMessage(`Catégorie créée : ${payload.data.category.name}.`);
        resetCreateForm();
        await categoriesQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer cette catégorie.");
      } finally {
        setIsCreating(false);
      }
    },
    [
      canManageCategories,
      createActive,
      createAttributeSchema,
      createDensity,
      createHasMapView,
      createIcon,
      createImageRatio,
      createLocationPrecision,
      createMinListings,
      createName,
      createOrder,
      createParentId,
      createSlug,
      categoriesQuery,
      resetCreateForm,
    ],
  );

  const handleUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManageCategories) {
        return;
      }
      if (!editTargetId.trim()) {
        setGlobalError("Sélectionne une catégorie à modifier.");
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
      if (editHasMapView !== "unchanged") {
        patch.hasMapView = editHasMapView === "true";
      }
      if (editMinListings.trim()) {
        const parsed = Number(editMinListings.trim());
        if (!Number.isFinite(parsed) || parsed < 0) {
          setGlobalError("Le seuil d'affichage accueil est invalide.");
          return;
        }
        patch.minListingsForHomeSection = parsed;
      }
      if (editAttributeSchema.trim()) {
        let attributeSchema: unknown;
        try {
          attributeSchema = JSON.parse(editAttributeSchema);
        } catch {
          setGlobalError("Le schéma d'attributs n'est pas un JSON valide.");
          return;
        }
        if (!Array.isArray(attributeSchema)) {
          setGlobalError("Le schéma d'attributs doit être un tableau JSON.");
          return;
        }
        patch.attributeSchema = attributeSchema;
      }

      if (Object.keys(patch).length === 0) {
        setGlobalError("Aucun changement détecté.");
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsUpdating(true);
      try {
        const response = await fetch(`/api/admin/v1/categories/${encodeURIComponent(editTargetId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });

        const payload = (await response.json()) as
          | { success: true; data: { category: CategoryItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de mettre à jour cette catégorie." : payload.error?.message);
        }

        setGlobalMessage(`Catégorie mise à jour : ${payload.data.category.name}.`);
        resetEditForm();
        await categoriesQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de mettre à jour cette catégorie.");
      } finally {
        setIsUpdating(false);
      }
    },
    [
      canManageCategories,
      editActive,
      editAttributeSchema,
      editHasMapView,
      editMinListings,
      editName,
      editOrder,
      editTargetId,
      categoriesQuery,
      resetEditForm,
    ],
  );

  const handleDelete = useCallback(
    async (categoryId: string) => {
      if (!canManageCategories) {
        return;
      }

      setGlobalMessage(null);
      setGlobalError(null);
      setIsDeletingCategoryId(categoryId);
      try {
        const response = await fetch(`/api/admin/v1/categories/${encodeURIComponent(categoryId)}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as
          | { success: true; data: { category: CategoryItem } }
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de supprimer cette catégorie." : payload.error?.message);
        }

        setGlobalMessage(`Catégorie supprimée : ${payload.data.category.name}.`);
        if (editTargetId === categoryId) {
          resetEditForm();
        }
        await categoriesQuery.refetch();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de supprimer cette catégorie.");
      } finally {
        setIsDeletingCategoryId(null);
      }
    },
    [canManageCategories, editTargetId, categoriesQuery, resetEditForm],
  );

  const renderCategoryRow = (category: CategoryItem, depth: number) => (
    <tr key={category.id} className="border-t">
      <td className="px-3 py-2 font-medium text-foreground">
        <span style={{ paddingLeft: `${depth * 16}px` }}>{depth > 0 ? "↳ " : ""}{category.name}</span>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{category.slug}</td>
      <td className="px-3 py-2">{category.isActive ? "Oui" : "Non"}</td>
      <td className="px-3 py-2">{category.order}</td>
      <td className="px-3 py-2">{category.defaultDensity}</td>
      <td className="px-3 py-2">{category.locationPrecision}</td>
      <td className="px-3 py-2">{category.hasMapView ? "Oui" : "Non"}</td>
      <td className="px-3 py-2">{category.attributeSchema.length}</td>
      <td className="px-3 py-2">{toDateLabel(category.updatedAt)}</td>
      <td className="px-3 py-2 text-right">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!canManageCategories || isDeletingCategoryId === category.id}
          onClick={() => void handleDelete(category.id)}
        >
          {isDeletingCategoryId === category.id ? "Suppression..." : "Supprimer"}
        </Button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catégories d'annonces"
        description="Taxonomie multi-catégories (Immobilier, Mode, ...) : arbre racine/feuille, schéma d'attributs par catégorie, activation."
        actions={
          <Button variant="outline" onClick={() => void refreshAll()} disabled={permissionsQuery.isFetching || categoriesQuery.isFetching}>
            Actualiser
          </Button>
        }
      />

      {globalError ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{globalError}</p> : null}
      {globalMessage ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">{globalMessage}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 text-sm text-muted-foreground">Total catégories</CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{categoriesQuery.data?.count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 text-sm text-muted-foreground">Catégories actives</CardHeader>
          <CardContent className="text-2xl font-semibold text-foreground">{activeCount}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Créer une catégorie</h2>
            <p className="text-sm text-muted-foreground">
              Permission requise : <code>categories.manage</code>. Une catégorie fille ne peut avoir qu&apos;une
              catégorie racine comme parent (arbre limité à 2 niveaux).
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleCreate}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createParentId}
                onChange={(event) => setCreateParentId(event.target.value)}
                disabled={!canManageCategories || isCreating}
              >
                <option value="">Catégorie racine (pas de parent)</option>
                {roots.map((root) => (
                  <option key={root.id} value={root.id}>
                    Sous {root.name}
                  </option>
                ))}
              </select>
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Nom (ex : Vêtements)"
                disabled={!canManageCategories || isCreating}
              />
              <Input
                value={createSlug}
                onChange={(event) => setCreateSlug(event.target.value)}
                placeholder="Slug (optionnel, dérivé du nom si vide)"
                disabled={!canManageCategories || isCreating}
              />
              <Input
                value={createIcon}
                onChange={(event) => setCreateIcon(event.target.value)}
                placeholder="Icône (optionnel, nom react-icons)"
                disabled={!canManageCategories || isCreating}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  value={createOrder}
                  onChange={(event) => setCreateOrder(event.target.value)}
                  placeholder="Ordre"
                  disabled={!canManageCategories || isCreating}
                />
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createActive ? "true" : "false"}
                  onChange={(event) => setCreateActive(event.target.value === "true")}
                  disabled={!canManageCategories || isCreating}
                >
                  <option value="false">Inactif (préparation)</option>
                  <option value="true">Actif (visible admin)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createImageRatio}
                  onChange={(event) => setCreateImageRatio(event.target.value as (typeof IMAGE_RATIOS)[number])}
                  disabled={!canManageCategories || isCreating}
                >
                  {IMAGE_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      Ratio image {ratio}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createLocationPrecision}
                  onChange={(event) =>
                    setCreateLocationPrecision(event.target.value as (typeof LOCATION_PRECISIONS)[number])
                  }
                  disabled={!canManageCategories || isCreating}
                >
                  {LOCATION_PRECISIONS.map((precision) => (
                    <option key={precision} value={precision}>
                      {LOCATION_PRECISION_LABELS[precision]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createDensity}
                  onChange={(event) => setCreateDensity(event.target.value as (typeof DENSITIES)[number])}
                  disabled={!canManageCategories || isCreating}
                >
                  {DENSITIES.map((density) => (
                    <option key={density} value={density}>
                      Densité {density}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={createHasMapView ? "true" : "false"}
                  onChange={(event) => setCreateHasMapView(event.target.value === "true")}
                  disabled={!canManageCategories || isCreating}
                >
                  <option value="false">Sans vue carte</option>
                  <option value="true">Avec vue carte</option>
                </select>
              </div>
              <Input
                type="number"
                min={0}
                value={createMinListings}
                onChange={(event) => setCreateMinListings(event.target.value)}
                placeholder="Seuil d'annonces avant section accueil"
                disabled={!canManageCategories || isCreating}
              />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Schéma d&apos;attributs (JSON)</label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  value={createAttributeSchema}
                  onChange={(event) => setCreateAttributeSchema(event.target.value)}
                  placeholder='[{"key":"taille","label":"Taille","type":"enum","options":["XS","S","M","L","XL"],"required":true,"facetable":true,"searchable":false,"showOnCard":true,"primary":true}]'
                  disabled={!canManageCategories || isCreating}
                />
              </div>
              <Button type="submit" disabled={!canManageCategories || isCreating || !createName.trim()}>
                {isCreating ? "Création..." : "Créer la catégorie"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Modifier une catégorie</h2>
            <p className="text-sm text-muted-foreground">Laisse un champ vide si inchangé.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editTargetId}
                onChange={(event) => setEditTargetId(event.target.value)}
                disabled={!canManageCategories || isUpdating}
              >
                <option value="">Sélectionne une catégorie</option>
                {roots.map((root) => (
                  <optgroup key={root.id} label={root.name}>
                    <option value={root.id}>{root.name}</option>
                    {(childrenByParent.get(root.id) ?? []).map((child) => (
                      <option key={child.id} value={child.id}>
                        ↳ {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="Nouveau nom"
                disabled={!canManageCategories || isUpdating}
              />
              <Input
                type="number"
                min={0}
                value={editOrder}
                onChange={(event) => setEditOrder(event.target.value)}
                placeholder="Nouvel ordre"
                disabled={!canManageCategories || isUpdating}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editActive}
                  onChange={(event) => setEditActive(event.target.value as "unchanged" | "true" | "false")}
                  disabled={!canManageCategories || isUpdating}
                >
                  <option value="unchanged">Statut inchangé</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editHasMapView}
                  onChange={(event) => setEditHasMapView(event.target.value as "unchanged" | "true" | "false")}
                  disabled={!canManageCategories || isUpdating}
                >
                  <option value="unchanged">Vue carte inchangée</option>
                  <option value="true">Avec vue carte</option>
                  <option value="false">Sans vue carte</option>
                </select>
              </div>
              <Input
                type="number"
                min={0}
                value={editMinListings}
                onChange={(event) => setEditMinListings(event.target.value)}
                placeholder="Nouveau seuil d'affichage accueil"
                disabled={!canManageCategories || isUpdating}
              />
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nouveau schéma d&apos;attributs (JSON, optionnel)</label>
                <textarea
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  value={editAttributeSchema}
                  onChange={(event) => setEditAttributeSchema(event.target.value)}
                  placeholder="Laisser vide pour ne pas toucher au schéma existant"
                  disabled={!canManageCategories || isUpdating}
                />
              </div>
              <Button type="submit" disabled={!canManageCategories || isUpdating || !editTargetId}>
                {isUpdating ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Arbre des catégories</h2>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {permissionsQuery.isLoading || categoriesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des catégories...</p>
          ) : null}
          {categoriesQuery.error ? <p className="text-sm text-destructive">{categoriesQuery.error.message}</p> : null}
          {!categoriesQuery.isLoading && !categoriesQuery.error ? (
            <table className="min-w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Actif</th>
                  <th className="px-3 py-2">Ordre</th>
                  <th className="px-3 py-2">Densité</th>
                  <th className="px-3 py-2">Localisation</th>
                  <th className="px-3 py-2">Carte</th>
                  <th className="px-3 py-2">Attributs</th>
                  <th className="px-3 py-2">Màj</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roots.map((root) => (
                  <Fragment key={root.id}>
                    {renderCategoryRow(root, 0)}
                    {(childrenByParent.get(root.id) ?? []).map((child) => renderCategoryRow(child, 1))}
                  </Fragment>
                ))}
                {categories.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={10}>
                      Aucune catégorie configurée.
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
