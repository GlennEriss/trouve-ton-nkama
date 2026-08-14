"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GABON_PROVINCES } from "@trouve-ton-nkama/core/domain";

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
};

type CategoryItem = {
  id: string;
  parentId: string | null;
  name: string;
  isActive: boolean;
  attributeSchema: AttributeSchemaField[];
};

type CategoriesPayload = {
  categories: CategoryItem[];
};

type AnnouncerLookupItem = {
  uid: string;
  fullName: string;
  email?: string | null;
  phoneNumbers: string[];
};

type AnnouncerLookupPayload = {
  announcers: AnnouncerLookupItem[];
};

type UploadedImage = {
  fileURL: string;
  filePATH: string;
  originalName: string;
};

function hasPermission(permissions: string[], required: string) {
  return permissions.includes("*.*") || permissions.includes(required);
}

async function fetchJson<T>(url: string, fallbackMessage: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { message?: string } };

  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? fallbackMessage : payload.error?.message || fallbackMessage);
  }

  return payload.data;
}

function formatAnnouncerLabel(announcer: AnnouncerLookupItem) {
  return `${announcer.fullName}${announcer.email ? ` — ${announcer.email}` : ""} (${announcer.uid})`;
}

export default function NewCategoryListingPage() {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [province, setProvince] = useState(GABON_PROVINCES[0].name);
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [callContact, setCallContact] = useState("");
  const [attributeValues, setAttributeValues] = useState<Record<string, string | boolean>>({});

  const [announcerQuery, setAnnouncerQuery] = useState("");
  const [announcerQueryDebounced, setAnnouncerQueryDebounced] = useState("");
  const [selectedAnnouncer, setSelectedAnnouncer] = useState<AnnouncerLookupItem | null>(null);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncerQueryDebounced(announcerQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [announcerQuery]);

  const permissionsQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetchJson<AuthMePayload>("/api/admin/v1/auth/me", "Impossible de charger les permissions."),
  });
  const permissions = permissionsQuery.data?.admin.permissions ?? [];
  const canCreate = useMemo(() => hasPermission(permissions, "listings.create"), [permissions]);

  const categoriesQuery = useQuery({
    queryKey: ["dashboard", "categories"],
    queryFn: () =>
      fetchJson<CategoriesPayload>("/api/admin/v1/categories", "Impossible de charger les catégories."),
    enabled: hasPermission(permissions, "categories.read"),
  });
  const categories = categoriesQuery.data?.categories ?? [];
  const { roots, leaves } = useMemo(
    () => ({
      roots: categories.filter((category) => category.parentId === null),
      leaves: categories.filter((category) => category.parentId !== null),
    }),
    [categories],
  );
  const selectedCategory = useMemo(
    () => leaves.find((category) => category.id === categoryId) ?? null,
    [leaves, categoryId],
  );

  const announcerLookupQuery = useQuery({
    queryKey: ["announcers", "lookup", announcerQueryDebounced],
    enabled: announcerQueryDebounced.length >= 2,
    queryFn: () =>
      fetchJson<AnnouncerLookupPayload>(
        `/api/admin/v1/announcers?query=${encodeURIComponent(announcerQueryDebounced)}&limit=10`,
        "Recherche annonceur impossible.",
      ),
  });
  const announcerResults = announcerLookupQuery.data?.announcers ?? [];

  const setAttributeValue = useCallback((key: string, value: string | boolean) => {
    setAttributeValues((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleUpload = useCallback(async () => {
    if (pendingFiles.length === 0 || !selectedAnnouncer) return;
    setIsUploading(true);
    setGlobalError(null);
    try {
      const formData = new FormData();
      formData.set("announcerUid", selectedAnnouncer.uid);
      for (const file of pendingFiles) {
        formData.append("files", file);
      }
      const response = await fetch("/api/admin/v1/listings/images/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | { success: true; data: { images: UploadedImage[] } }
        | { success: false; error?: { message?: string } };
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? "Échec de l'upload." : payload.error?.message);
      }
      setUploadedImages((previous) => [...previous, ...payload.data.images]);
      setPendingFiles([]);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Échec de l'upload.");
    } finally {
      setIsUploading(false);
    }
  }, [pendingFiles, selectedAnnouncer]);

  const resetForm = useCallback(() => {
    setCategoryId("");
    setTitle("");
    setDescription("");
    setPrice("");
    setCity("");
    setContact("");
    setWhatsappContact("");
    setCallContact("");
    setAttributeValues({});
    setUploadedImages([]);
    setPendingFiles([]);
    setSelectedAnnouncer(null);
    setAnnouncerQuery("");
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canCreate) return;

      setGlobalError(null);
      setGlobalMessage(null);

      if (!selectedCategory) {
        setGlobalError("Sélectionne une sous-catégorie.");
        return;
      }
      if (!selectedAnnouncer) {
        setGlobalError("Sélectionne un annonceur.");
        return;
      }
      if (uploadedImages.length === 0) {
        setGlobalError("Ajoute au moins une image (upload requis avant envoi).");
        return;
      }
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        setGlobalError("Prix invalide.");
        return;
      }
      for (const field of selectedCategory.attributeSchema) {
        if (field.required && !attributeValues[field.key]) {
          setGlobalError(`Champ requis manquant : ${field.label}.`);
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/admin/v1/category-listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: selectedCategory.id,
            announcerUid: selectedAnnouncer.uid,
            title,
            description,
            price: priceNumber,
            province,
            city,
            images: uploadedImages.map(({ fileURL, filePATH }) => ({ fileURL, filePATH })),
            contact: contact || undefined,
            whatsappContact: whatsappContact || undefined,
            callContact: callContact || undefined,
            attributes: attributeValues,
          }),
        });
        const payload = (await response.json()) as
          | { success: true; data: { propertyId: string } }
          | { success: false; error?: { message?: string } };
        if (!response.ok || !payload.success) {
          throw new Error(payload.success ? "Impossible de créer cette annonce." : payload.error?.message);
        }
        setGlobalMessage(
          `Annonce créée (en attente de modération) : ${payload.data.propertyId}.`,
        );
        resetForm();
      } catch (error) {
        setGlobalError(error instanceof Error ? error.message : "Impossible de créer cette annonce.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      attributeValues,
      callContact,
      canCreate,
      city,
      contact,
      description,
      price,
      province,
      resetForm,
      selectedAnnouncer,
      selectedCategory,
      title,
      uploadedImages,
      whatsappContact,
    ],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle annonce multi-catégorie"
        description="Saisie admin pilotée par le schéma d'attributs de la catégorie choisie (Lot 2). L'annonce part toujours en modération (PENDING) — jamais publiée automatiquement."
      />

      {globalError ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{globalError}</p> : null}
      {globalMessage ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">{globalMessage}</p>
      ) : null}

      <Card>
        <CardHeader className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Annonce</h2>
          <p className="text-sm text-muted-foreground">Permission requise : <code>listings.create</code></p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setAttributeValues({});
                }}
                disabled={!canCreate || isSubmitting}
              >
                <option value="">Sélectionne une sous-catégorie</option>
                {roots.map((root) => (
                  <optgroup key={root.id} label={root.name}>
                    {leaves
                      .filter((leaf) => leaf.parentId === root.id)
                      .map((leaf) => (
                        <option key={leaf.id} value={leaf.id}>
                          {leaf.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>

              <div className="relative">
                <Input
                  value={announcerQuery}
                  onChange={(event) => {
                    setAnnouncerQuery(event.target.value);
                    setSelectedAnnouncer(null);
                  }}
                  placeholder="Rechercher un annonceur (nom, email, tel)"
                  disabled={!canCreate || isSubmitting}
                />
                {selectedAnnouncer ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sélectionné : {formatAnnouncerLabel(selectedAnnouncer)}
                  </p>
                ) : announcerResults.length > 0 ? (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background text-sm shadow-md">
                    {announcerResults.map((announcer) => (
                      <li key={announcer.uid}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-muted"
                          onClick={() => {
                            setSelectedAnnouncer(announcer);
                            setAnnouncerQuery(formatAnnouncerLabel(announcer));
                            setContact((current) => current || announcer.phoneNumbers[0] || "");
                          }}
                        >
                          {formatAnnouncerLabel(announcer)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titre (ex : Robe Zara taille M)"
              disabled={!canCreate || isSubmitting}
            />
            <textarea
              className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              disabled={!canCreate || isSubmitting}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Prix (FCFA)"
                disabled={!canCreate || isSubmitting}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={province}
                onChange={(event) => setProvince(event.target.value)}
                disabled={!canCreate || isSubmitting}
              >
                {GABON_PROVINCES.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ville"
                disabled={!canCreate || isSubmitting}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="Contact (par défaut : tel. annonceur)"
                disabled={!canCreate || isSubmitting}
              />
              <Input
                value={whatsappContact}
                onChange={(event) => setWhatsappContact(event.target.value)}
                placeholder="WhatsApp (optionnel)"
                disabled={!canCreate || isSubmitting}
              />
              <Input
                value={callContact}
                onChange={(event) => setCallContact(event.target.value)}
                placeholder="Appel (optionnel)"
                disabled={!canCreate || isSubmitting}
              />
            </div>

            {selectedCategory && selectedCategory.attributeSchema.length > 0 ? (
              <div className="space-y-2 rounded-md border border-input p-3">
                <p className="text-sm font-medium text-foreground">Caractéristiques ({selectedCategory.name})</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedCategory.attributeSchema.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {field.label}
                        {field.required ? " *" : ""}
                      </label>
                      {field.type === "enum" ? (
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={(attributeValues[field.key] as string) ?? ""}
                          onChange={(event) => setAttributeValue(field.key, event.target.value)}
                          disabled={!canCreate || isSubmitting}
                        >
                          <option value="">—</option>
                          {(field.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={attributeValues[field.key] === true ? "true" : "false"}
                          onChange={(event) => setAttributeValue(field.key, event.target.value === "true")}
                          disabled={!canCreate || isSubmitting}
                        >
                          <option value="false">Non</option>
                          <option value="true">Oui</option>
                        </select>
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={(attributeValues[field.key] as string) ?? ""}
                          onChange={(event) => setAttributeValue(field.key, event.target.value)}
                          disabled={!canCreate || isSubmitting}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2 rounded-md border border-input p-3">
              <p className="text-sm font-medium text-foreground">Images</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
                disabled={!canCreate || isSubmitting || !selectedAnnouncer}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canCreate || isUploading || pendingFiles.length === 0 || !selectedAnnouncer}
                onClick={() => void handleUpload()}
              >
                {isUploading ? "Upload..." : "Uploader"}
              </Button>
              {!selectedAnnouncer ? (
                <p className="text-xs text-muted-foreground">Sélectionne d&apos;abord un annonceur (chemin de stockage).</p>
              ) : null}
              {uploadedImages.length > 0 ? (
                <ul className="text-xs text-muted-foreground">
                  {uploadedImages.map((image) => (
                    <li key={image.filePATH}>{image.originalName}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <Button type="submit" disabled={!canCreate || isSubmitting}>
              {isSubmitting ? "Création..." : "Créer l'annonce (PENDING)"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
