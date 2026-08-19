"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, X } from "lucide-react";

import { Badge } from "@trouve-ton-nkama/ui/badge";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui-kit/page-header";
import { parseApifyJson } from "@/modules/apify/application/apify-parse.service";
import { runApifyPipeline } from "@/modules/apify/application/apify-transform.service";
import {
  applyResolution,
  geocodeBestEffort,
  resolveFromGoogle,
  resolveFromOsm,
  type GeoResolution,
  type GeoSource,
} from "@/modules/apify/application/apify-geocode.service";
import type { ApifyDraftMeta, ApifyListingDraft, ApifyPipelineResult, ApifyReelDraft } from "@/modules/apify/domain/types";
import type { FacebookGroupSource } from "@/modules/apify/domain/group-source.types";
import type { StatusProperty, TypeProperty } from "@/modules/apify/domain/platform-listing";
import type { GabonOsmSelectorData } from "@/modules/location-osm/domain/types";

const TYPE_LABELS: Record<TypeProperty, string> = {
  Home: "Maison",
  Studio: "Studio",
  Apartment: "Appartement",
  Villa: "Villa",
  Room: "Chambre",
  Land: "Terrain",
  Shop: "Magasin",
  Building: "Immeuble",
  Desk: "Bureau",
  Kiosk: "Kiosque",
  Property: "Bien",
  Logement: "Logement",
  Duplex: "Duplex",
  Warehouse: "Entrepôt",
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS) as Array<[TypeProperty, string]>;

const GEO_SOURCE_LABELS: Record<GeoSource, string> = {
  known: "Quartier connu",
  "osm-quarter": "Quartier OSM",
  "osm-city": "Ville OSM",
  google: "Google",
};

// Sources precise enough to not need a Google refinement.
const RESOLVED_SOURCES: GeoSource[] = ["known", "osm-quarter", "google"];

type GeoStatus = "none" | "resolved" | "loading" | "error";

type ScrapeStatus = "idle" | "running" | "succeeded" | "failed" | "stalled";
const SCRAPE_MAX_POLL_MS = 10 * 60 * 1000;
type GeoState = { status: GeoStatus; source?: GeoSource; message?: string };

type ImportStatus = "idle" | "loading" | "created" | "error";
type ImportState = { status: ImportStatus; propertyId?: string; error?: string };
type ReelImportState = { status: ImportStatus; reelId?: string; error?: string };

type AnnouncerOption = { uid: string; fullName: string; email: string | null; phoneNumbers: string[] };
type PlatformAnnouncerOption = AnnouncerOption & { kind: string | null };

const PLATFORM_KIND_LABELS: Record<string, string> = {
  agency: "Agences",
  brand: "Enseignes",
  person: "Particuliers",
};

type ImportResult = { index: number; ok: boolean; propertyId?: string; imageCount: number; error?: string };
type ReelImportResult = { index: number; ok: boolean; reelId?: string; error?: string };

type DraftEditImage = { fileURL: string; filePATH: string };

const MAX_DRAFT_IMAGES = 10;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DraftEditFormState = {
  title: string;
  description: string;
  typeProperty: TypeProperty | "";
  status: StatusProperty;
  price: string;
  area: string;
  tags: string;
  images: DraftEditImage[];
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  longitude: string;
  latitude: string;
  isLocExact: boolean;
  contact: string;
  isOwner: boolean;
  nbrRooms: string;
  nbrLivingRoom: string;
  nbrKitchens: string;
  nbrBathrooms: string;
  nbrToilets: string;
  nbrGarages: string;
  nbrFloors: string;
  nbrPiscine: string;
  nbrFloorStudio: string;
  numeroStudio: string;
  nbrFloorApartment: string;
  numeroApartment: string;
  nbrApartments: string;
  hasParking: boolean;
  nbrToilet: string;
  nbrSections: string;
  kioskType: string;
  roomType: string;
};

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none";
const labelClass = "space-y-1 text-xs font-medium text-muted-foreground";

async function fetchOsmSelector(): Promise<GabonOsmSelectorData> {
  const response = await fetch("/api/admin/v1/osm/gabon");
  const body = (await response.json()) as
    | { success: true; data: GabonOsmSelectorData }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Source OSM Gabon indisponible.");
  }
  return body.data;
}

async function fetchAnnouncers(query: string): Promise<AnnouncerOption[]> {
  const params = new URLSearchParams({ limit: "10", query: query.trim(), status: "all", presence: "all" });
  const response = await fetch(`/api/admin/v1/announcers?${params.toString()}`);
  const body = (await response.json()) as
    | { success: true; data: { announcers: AnnouncerOption[] } }
    | { success: false; error?: { message?: string } };
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Erreur" : body.error?.message ?? "Impossible de charger les annonceurs.");
  }
  return body.data.announcers ?? [];
}

/** Annonceurs gérés par la plateforme, pour la sélection rapide (voir ?platform=true). */
async function fetchPlatformAnnouncers(): Promise<PlatformAnnouncerOption[]> {
  const response = await fetch("/api/admin/v1/announcers?platform=true");
  const body = (await response.json()) as
    | { success: true; data: { announcers: PlatformAnnouncerOption[] } }
    | { success: false; error?: { message?: string } };
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Erreur" : body.error?.message ?? "Impossible de charger les annonceurs.");
  }
  return body.data.announcers ?? [];
}

async function importDrafts(
  announcerUid: string,
  drafts: ApifyListingDraft[],
): Promise<{ results: ImportResult[]; created: number; failed: number }> {
  const response = await fetch("/api/admin/v1/apify/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ announcerUid, drafts }),
  });
  const body = (await response.json()) as
    | { success: true; data: { results: ImportResult[]; created: number; failed: number } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec de l'import.");
  }
  return body.data;
}

async function fetchGroupSources(): Promise<{ groups: FacebookGroupSource[]; count: number }> {
  const response = await fetch("/api/admin/v1/apify/groups");
  const body = (await response.json()) as
    | { success: true; data: { groups: FacebookGroupSource[]; count: number } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Impossible de charger les groupes.");
  }
  return body.data;
}

async function createGroupSourceApi(url: string, label: string): Promise<FacebookGroupSource> {
  const response = await fetch("/api/admin/v1/apify/groups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(label ? { url, label } : { url }),
  });
  const body = (await response.json()) as
    | { success: true; data: { group: FacebookGroupSource } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Impossible d'enregistrer ce groupe.");
  }
  return body.data.group;
}

async function updateGroupSourceApi(
  groupId: string,
  patch: { url?: string; label?: string | null },
): Promise<FacebookGroupSource> {
  const response = await fetch(`/api/admin/v1/apify/groups/${groupId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = (await response.json()) as
    | { success: true; data: { group: FacebookGroupSource } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Impossible de mettre à jour ce groupe.");
  }
  return body.data.group;
}

async function deleteGroupSourceApi(groupId: string): Promise<void> {
  const response = await fetch(`/api/admin/v1/apify/groups/${groupId}`, { method: "DELETE" });
  const body = (await response.json()) as { success: true } | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Impossible de supprimer ce groupe.");
  }
}

async function triggerScrape(
  groupUrls: string[],
  resultsLimit: number,
): Promise<{ runId: string; datasetId: string }> {
  const response = await fetch("/api/admin/v1/apify/scrape", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ groupUrls, resultsLimit }),
  });
  const body = (await response.json()) as
    | { success: true; data: { runId: string; datasetId: string } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec du déclenchement du scraping.");
  }
  return body.data;
}

type ScrapePollResult = { status: string; items?: unknown[]; error?: string };

async function pollScrape(runId: string): Promise<ScrapePollResult> {
  const response = await fetch(`/api/admin/v1/apify/scrape/${runId}`);
  const body = (await response.json()) as
    | { success: true; data: ScrapePollResult }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec de la vérification du run.");
  }
  return body.data;
}

async function importReels(
  announcerUid: string,
  reels: Array<ApifyReelDraft & { propertyId?: string }>,
): Promise<{ results: ReelImportResult[]; created: number; failed: number }> {
  const response = await fetch("/api/admin/v1/apify/import-reel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ announcerUid, reels }),
  });
  const body = (await response.json()) as
    | { success: true; data: { results: ReelImportResult[]; created: number; failed: number } }
    | { success: false; error?: { message?: string } };
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec de l'import du reel.");
  }
  return body.data;
}

// Manually downloaded photos (from the real post, since fbcdn URLs expire)
// are uploaded through the same endpoint the listing editor uses.
async function uploadDraftImages(files: File[], announcerUid?: string): Promise<DraftEditImage[]> {
  const formData = new FormData();
  if (announcerUid) formData.append("announcerUid", announcerUid);
  for (const file of files) formData.append("files", file);
  const response = await fetch("/api/admin/v1/listings/images/upload", {
    method: "POST",
    body: formData,
  });
  const body = (await response.json()) as
    | { success: true; data: { images: DraftEditImage[] } }
    | { success: false; error?: { message?: string } };
  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Erreur" : body.error?.message ?? "Échec de l'envoi des images.");
  }
  return body.data.images.map((image) => ({ fileURL: image.fileURL, filePATH: image.filePATH }));
}

function formatPrice(price: number): string {
  if (price <= 0) return "Prix non détecté";
  return `${new Intl.NumberFormat("fr-FR").format(price)} XAF`;
}

function roomsSummary(draft: ApifyListingDraft): string {
  const parts: string[] = [];
  if (draft.nbrRooms) parts.push(`${draft.nbrRooms} ch.`);
  if (draft.nbrLivingRoom) parts.push(`${draft.nbrLivingRoom} salon`);
  if (draft.nbrKitchens) parts.push(`${draft.nbrKitchens} cuis.`);
  if (draft.nbrBathrooms) parts.push(`${draft.nbrBathrooms} douche`);
  if (draft.nbrToilets) parts.push(`${draft.nbrToilets} WC`);
  return parts.join(" · ");
}

function hasCoords(draft: ApifyListingDraft): boolean {
  return Boolean(draft.longitude || draft.latitude);
}

// Location labels are recomputed against the (possibly geocoded) draft.
function visibleMissing(meta: ApifyDraftMeta): string[] {
  const draft = meta.draft;
  return meta.missingFields.filter((field) => {
    if (field === "Type de bien") return !draft.typeProperty;
    if (field === "Statut (location/vente)") return !draft.status;
    if (field === "Prix") return !draft.price || draft.price <= 0;
    if (field === "Ville") return !draft.city;
    if (field === "Quartier") return !draft.street;
    if (field === "Contact") return !draft.contact;
    if (field === "Images") return draft.images.length === 0;
    if (field === "Coordonnées GPS") return !hasCoords(draft);
    return true;
  });
}

function numberText(value: number | undefined | null, hideZero = false): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (hideZero && value === 0) return "";
  return String(value);
}

function toNonNegativeNumber(value: string, fallback = 0): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toCoordinate(value: string, fallback = 0): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftToEditForm(draft: ApifyListingDraft): DraftEditFormState {
  return {
    title: draft.title,
    description: draft.description,
    typeProperty: draft.typeProperty,
    status: draft.status,
    price: numberText(draft.price, true),
    area: numberText(draft.area, true),
    tags: draft.tags.join(", "),
    images: draft.images.map((image) => ({ fileURL: image.fileURL, filePATH: image.filePATH ?? "" })),
    street: draft.street,
    city: draft.city,
    province: draft.province,
    country: draft.country,
    countryCode: draft.countryCode,
    longitude: numberText(draft.longitude, true),
    latitude: numberText(draft.latitude, true),
    isLocExact: Boolean(draft.isLocExact),
    contact: draft.contact ?? "",
    isOwner: Boolean(draft.isOwner),
    nbrRooms: numberText(draft.nbrRooms),
    nbrLivingRoom: numberText(draft.nbrLivingRoom),
    nbrKitchens: numberText(draft.nbrKitchens),
    nbrBathrooms: numberText(draft.nbrBathrooms),
    nbrToilets: numberText(draft.nbrToilets),
    nbrGarages: numberText(draft.nbrGarages),
    nbrFloors: numberText(draft.nbrFloors),
    nbrPiscine: numberText(draft.nbrPiscine),
    nbrFloorStudio: numberText(draft.nbrFloorStudio),
    numeroStudio: draft.numeroStudio ?? "",
    nbrFloorApartment: numberText(draft.nbrFloorApartment),
    numeroApartment: draft.numeroApartment ?? "",
    nbrApartments: numberText(draft.nbrApartments),
    hasParking: Boolean(draft.hasParking),
    nbrToilet: numberText(draft.nbrToilet),
    nbrSections: numberText(draft.nbrSections),
    kioskType: draft.kioskType ?? "",
    roomType: draft.roomType ?? "",
  };
}

function applyDraftEdit(draft: ApifyListingDraft, form: DraftEditFormState): ApifyListingDraft {
  return {
    ...draft,
    title: form.title.trim(),
    description: form.description.trim(),
    typeProperty: form.typeProperty,
    status: form.status,
    price: toNonNegativeNumber(form.price),
    area: toNonNegativeNumber(form.area),
    tags: parseList(form.tags).slice(0, 6),
    images: form.images.slice(0, MAX_DRAFT_IMAGES),
    street: form.street.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
    country: form.country.trim() || "Gabon",
    countryCode: form.countryCode.trim().toUpperCase() || "GA",
    longitude: toCoordinate(form.longitude),
    latitude: toCoordinate(form.latitude),
    isLocExact: form.isLocExact,
    contact: form.contact.trim(),
    isOwner: form.isOwner,
    nbrRooms: toNonNegativeNumber(form.nbrRooms, 1),
    nbrLivingRoom: toNonNegativeNumber(form.nbrLivingRoom, 1),
    nbrKitchens: toNonNegativeNumber(form.nbrKitchens, 1),
    nbrBathrooms: toNonNegativeNumber(form.nbrBathrooms, 1),
    nbrToilets: toNonNegativeNumber(form.nbrToilets, 1),
    nbrGarages: toNonNegativeNumber(form.nbrGarages),
    nbrFloors: toNonNegativeNumber(form.nbrFloors, 1),
    nbrPiscine: toNonNegativeNumber(form.nbrPiscine),
    nbrFloorStudio: toNonNegativeNumber(form.nbrFloorStudio, 1),
    numeroStudio: form.numeroStudio.trim() || "NC",
    nbrFloorApartment: toNonNegativeNumber(form.nbrFloorApartment, 1),
    numeroApartment: form.numeroApartment.trim() || "NC",
    nbrApartments: toNonNegativeNumber(form.nbrApartments, 1),
    hasParking: form.hasParking,
    nbrToilet: toNonNegativeNumber(form.nbrToilet, 1),
    nbrSections: toNonNegativeNumber(form.nbrSections, 1),
    kioskType: form.kioskType.trim(),
    roomType: form.roomType.trim() || "Chambre américaine",
  };
}

function ImageThumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-border bg-muted px-1 text-center text-[10px] leading-tight text-muted-foreground"
        title="Aperçu inaccessible depuis ce navigateur (réseau/VPN qui bloque fbcdn.net, ou URL expirée) — n'empêche pas forcément la création de l'annonce, qui télécharge l'image depuis le serveur."
      >
        Aperçu indisponible
      </div>
    );
  }

  return (
    // fbcdn is not configured for next/image; plain img is intentional here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-20 w-20 rounded-md border border-border object-cover"
      loading="lazy"
    />
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "muted" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className={tone === "muted" ? "text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>{label}</p>
    </div>
  );
}

// Label/value pairs for the platform attributes carried by this draft's subtype.
function listingAttributes(draft: ApifyListingDraft): Array<{ label: string; value: string }> {
  const attrs: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | number | boolean | undefined | null) => {
    if (value === undefined || value === null || value === "") return;
    attrs.push({ label, value: typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value) });
  };

  push("Type", draft.typeProperty ? TYPE_LABELS[draft.typeProperty] : "");
  push("Statut", draft.status === "FOR_RENT" ? "Location" : "Vente");
  push("Propriétaire", typeof draft.isOwner === "boolean" ? draft.isOwner : false);
  if (draft.price > 0) push("Prix", `${new Intl.NumberFormat("fr-FR").format(draft.price)} XAF`);
  if (draft.area > 0) push("Superficie", `${draft.area} m²`);
  push("Chambres", draft.nbrRooms);
  push("Salons", draft.nbrLivingRoom);
  push("Cuisines", draft.nbrKitchens);
  push("Salles de bain", draft.nbrBathrooms);
  push("Toilettes", draft.nbrToilets ?? draft.nbrToilet);
  push("Étages", draft.nbrFloors);
  push("Garages", draft.nbrGarages);
  push("Piscines", draft.nbrPiscine);
  push("Étage appartement", draft.nbrFloorApartment);
  push("N° appartement", draft.numeroApartment);
  push("Étage studio", draft.nbrFloorStudio);
  push("N° studio", draft.numeroStudio);
  push("Appartements", draft.nbrApartments);
  push("Parking", draft.hasParking);
  push("Sections", draft.nbrSections);
  push("Type kiosque", draft.kioskType);
  push("Type chambre", draft.roomType);
  push("Quartier / rue", draft.street);
  push("Ville", draft.city);
  push("Province", draft.province);
  push("Pays", draft.country);
  push("Contact", draft.contact);
  if (hasCoords(draft)) {
    push("Coordonnées", `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)} (${draft.isLocExact ? "exact" : "approx."})`);
  }
  return attrs;
}

// Alphabetical order (French collation, accent/case-insensitive) for the
// localisation dropdowns fed by the geolocation (OSM) reference.
function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
}

function DraftEditDialog({
  index,
  item,
  osm,
  announcerUid,
  open,
  onOpenChange,
  onSave,
}: {
  index: number;
  item: ApifyDraftMeta;
  osm: GabonOsmSelectorData | null;
  announcerUid?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (index: number, form: DraftEditFormState) => void;
}) {
  const [form, setForm] = useState<DraftEditFormState>(() => draftToEditForm(item.draft));
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const setField = <K extends keyof DraftEditFormState>(key: K, value: DraftEditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const removeImage = (imageIndex: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== imageIndex) }));
  };

  const moveImage = (from: number, to: number) => {
    setForm((prev) => {
      if (to < 0 || to >= prev.images.length) return prev;
      const images = [...prev.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...prev, images };
    });
  };

  const addManualImageUrl = () => {
    const url = manualUrl.trim();
    if (!url || form.images.length >= MAX_DRAFT_IMAGES) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, { fileURL: url, filePATH: "" }] }));
    setManualUrl("");
  };

  // Manually downloaded photos from the real post (fbcdn links expire fast,
  // so the reviewer grabs them from the post itself and uploads them here).
  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const invalid = files.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type));
    if (invalid) {
      setUploadError("Format non supporté (JPG, PNG ou WEBP uniquement).");
      return;
    }

    const remaining = MAX_DRAFT_IMAGES - form.images.length;
    if (remaining <= 0) {
      setUploadError(`Maximum ${MAX_DRAFT_IMAGES} images.`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadDraftImages(files.slice(0, remaining), announcerUid);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded].slice(0, MAX_DRAFT_IMAGES) }));
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Échec de l'envoi des images.");
    } finally {
      setUploading(false);
    }
  };

  // Localisation options drawn from the geolocation reference, sorted A→Z and
  // cascaded province → ville → quartier.
  const provinceOptions = useMemo(() => sortByName(osm?.provinces ?? []), [osm?.provinces]);

  const cityOptions = useMemo(() => {
    const cities = osm?.cities ?? [];
    const scoped = form.province ? cities.filter((city) => city.province === form.province) : cities;
    return sortByName(scoped);
  }, [osm?.cities, form.province]);

  const quarterOptions = useMemo(() => {
    const quarters = osm?.quarters ?? [];
    const scoped = form.city ? quarters.filter((quarter) => quarter.city === form.city) : quarters;
    return sortByName(scoped);
  }, [osm?.quarters, form.city]);

  // Select a province: fill its centroid and drop now-inconsistent city/quarter.
  const handleProvinceSelect = (name: string) => {
    const province = provinceOptions.find((option) => option.name === name);
    setForm((prev) => ({
      ...prev,
      province: name,
      city: "",
      street: "",
      ...(province ? { latitude: String(province.lat), longitude: String(province.lon) } : {}),
    }));
  };

  // Select a city: adopt its province + centroid and drop the now-stale quarter.
  const handleCitySelect = (name: string) => {
    const city = (osm?.cities ?? []).find((option) => option.name === name);
    setForm((prev) => ({
      ...prev,
      city: name,
      street: "",
      province: city?.province ?? prev.province,
      ...(city ? { latitude: String(city.lat), longitude: String(city.lon) } : {}),
    }));
  };

  // Select a quarter: adopt its city/province and precise centroid.
  const handleQuarterSelect = (name: string) => {
    const quarter = (osm?.quarters ?? []).find(
      (option) => option.name === name && (!form.city || option.city === form.city),
    );
    setForm((prev) => ({
      ...prev,
      street: name,
      city: quarter?.city ?? prev.city,
      province: quarter?.province ?? prev.province,
      ...(quarter ? { latitude: String(quarter.lat), longitude: String(quarter.lon) } : {}),
    }));
  };

  const save = () => {
    onSave(index, form);
    onOpenChange(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;annonce Apify</DialogTitle>
          <DialogDescription>#{index + 1} · {form.title.trim() || "Sans titre"}</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenu</p>
            <label className={labelClass}>
              Titre
              <input
                className={inputClass}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Description
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className={labelClass}>
                Type de bien
                <select
                  className={inputClass}
                  value={form.typeProperty}
                  onChange={(event) => setField("typeProperty", event.target.value as TypeProperty | "")}
                >
                  <option value="">Non défini</option>
                  {TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Statut
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(event) => setField("status", event.target.value as StatusProperty)}
                >
                  <option value="FOR_RENT">Location</option>
                  <option value="FOR_SALE">Vente</option>
                </select>
              </label>
              <label className={labelClass}>
                Prix (XAF)
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={form.price}
                  onChange={(event) => setField("price", event.target.value)}
                  placeholder="0"
                />
              </label>
              <label className={labelClass}>
                Superficie (m²)
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={form.area}
                  onChange={(event) => setField("area", event.target.value)}
                  placeholder="Inconnue"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Localisation</p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className={labelClass}>
                Province
                <select
                  className={inputClass}
                  value={form.province}
                  onChange={(event) => handleProvinceSelect(event.target.value)}
                >
                  <option value="">{osm ? "Sélectionner une province" : "Chargement du référentiel…"}</option>
                  {form.province && !provinceOptions.some((option) => option.name === form.province) ? (
                    <option value={form.province}>{form.province} (actuel)</option>
                  ) : null}
                  {provinceOptions.map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Ville
                <select
                  className={inputClass}
                  value={form.city}
                  onChange={(event) => handleCitySelect(event.target.value)}
                >
                  <option value="">{osm ? "Sélectionner une ville" : "Chargement du référentiel…"}</option>
                  {form.city && !cityOptions.some((option) => option.name === form.city) ? (
                    <option value={form.city}>{form.city} (actuel)</option>
                  ) : null}
                  {cityOptions.map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Quartier / rue
                <select
                  className={inputClass}
                  value={form.street}
                  onChange={(event) => handleQuarterSelect(event.target.value)}
                >
                  <option value="">{osm ? "Sélectionner un quartier" : "Chargement du référentiel…"}</option>
                  {form.street && !quarterOptions.some((option) => option.name === form.street) ? (
                    <option value={form.street}>{form.street} (actuel)</option>
                  ) : null}
                  {quarterOptions.map((option) => (
                    <option key={option.id} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Pays
                <input
                  className={inputClass}
                  value={form.country}
                  onChange={(event) => setField("country", event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Code pays
                <input
                  className={inputClass}
                  value={form.countryCode}
                  onChange={(event) => setField("countryCode", event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Contact
                <input
                  className={inputClass}
                  value={form.contact}
                  onChange={(event) => setField("contact", event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Longitude
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(event) => setField("longitude", event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Latitude
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(event) => setField("latitude", event.target.value)}
                />
              </label>
              <div className="flex items-end gap-4 pb-2">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.isLocExact}
                    onChange={(event) => setField("isLocExact", event.target.checked)}
                  />
                  Position exacte
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.isOwner}
                    onChange={(event) => setField("isOwner", event.target.checked)}
                  />
                  Propriétaire
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détails</p>
            <div className="grid gap-3 md:grid-cols-4">
              <label className={labelClass}>
                Chambres / pièces
                <input className={inputClass} inputMode="numeric" value={form.nbrRooms} onChange={(event) => setField("nbrRooms", event.target.value)} />
              </label>
              <label className={labelClass}>
                Salons
                <input className={inputClass} inputMode="numeric" value={form.nbrLivingRoom} onChange={(event) => setField("nbrLivingRoom", event.target.value)} />
              </label>
              <label className={labelClass}>
                Cuisines
                <input className={inputClass} inputMode="numeric" value={form.nbrKitchens} onChange={(event) => setField("nbrKitchens", event.target.value)} />
              </label>
              <label className={labelClass}>
                Salles d&apos;eau
                <input className={inputClass} inputMode="numeric" value={form.nbrBathrooms} onChange={(event) => setField("nbrBathrooms", event.target.value)} />
              </label>
              <label className={labelClass}>
                Toilettes
                <input className={inputClass} inputMode="numeric" value={form.nbrToilets} onChange={(event) => setField("nbrToilets", event.target.value)} />
              </label>
              <label className={labelClass}>
                Étages
                <input className={inputClass} inputMode="numeric" value={form.nbrFloors} onChange={(event) => setField("nbrFloors", event.target.value)} />
              </label>
              <label className={labelClass}>
                Garages
                <input className={inputClass} inputMode="numeric" value={form.nbrGarages} onChange={(event) => setField("nbrGarages", event.target.value)} />
              </label>
              <label className={labelClass}>
                Piscines
                <input className={inputClass} inputMode="numeric" value={form.nbrPiscine} onChange={(event) => setField("nbrPiscine", event.target.value)} />
              </label>
              <label className={labelClass}>
                Étage studio
                <input className={inputClass} inputMode="numeric" value={form.nbrFloorStudio} onChange={(event) => setField("nbrFloorStudio", event.target.value)} />
              </label>
              <label className={labelClass}>
                N° studio
                <input className={inputClass} value={form.numeroStudio} onChange={(event) => setField("numeroStudio", event.target.value)} />
              </label>
              <label className={labelClass}>
                Étage appartement
                <input className={inputClass} inputMode="numeric" value={form.nbrFloorApartment} onChange={(event) => setField("nbrFloorApartment", event.target.value)} />
              </label>
              <label className={labelClass}>
                N° appartement
                <input className={inputClass} value={form.numeroApartment} onChange={(event) => setField("numeroApartment", event.target.value)} />
              </label>
              <label className={labelClass}>
                Appartements
                <input className={inputClass} inputMode="numeric" value={form.nbrApartments} onChange={(event) => setField("nbrApartments", event.target.value)} />
              </label>
              <label className={labelClass}>
                Toilettes commerce
                <input className={inputClass} inputMode="numeric" value={form.nbrToilet} onChange={(event) => setField("nbrToilet", event.target.value)} />
              </label>
              <label className={labelClass}>
                Sections
                <input className={inputClass} inputMode="numeric" value={form.nbrSections} onChange={(event) => setField("nbrSections", event.target.value)} />
              </label>
              <label className="flex items-end gap-2 pb-2 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.hasParking}
                  onChange={(event) => setField("hasParking", event.target.checked)}
                />
                Parking
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Type kiosque
                <input className={inputClass} value={form.kioskType} onChange={(event) => setField("kioskType", event.target.value)} />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Type chambre
                <input className={inputClass} value={form.roomType} onChange={(event) => setField("roomType", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médias & tags</p>
            <label className={labelClass}>
              Tags
              <input
                className={inputClass}
                value={form.tags}
                onChange={(event) => setField("tags", event.target.value)}
                placeholder="tag 1, tag 2"
              />
            </label>
            <div className="space-y-2">
              <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                  Images ({form.images.length}/{MAX_DRAFT_IMAGES})
                </span>
              </p>

              {form.images.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((image, imageIndex) => (
                    <div key={`${image.fileURL}-${imageIndex}`} className="group relative">
                      <ImageThumb url={image.fileURL} />
                      <button
                        type="button"
                        aria-label="Supprimer cette image"
                        onClick={() => removeImage(imageIndex)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                      >
                        <X className="size-3" />
                      </button>
                      <div className="absolute -bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                        <button
                          type="button"
                          aria-label="Déplacer vers la gauche"
                          disabled={imageIndex === 0}
                          onClick={() => moveImage(imageIndex, imageIndex - 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-muted-foreground shadow disabled:opacity-30"
                        >
                          <ChevronLeft className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Déplacer vers la droite"
                          disabled={imageIndex === form.images.length - 1}
                          onClick={() => moveImage(imageIndex, imageIndex + 1)}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-muted-foreground shadow disabled:opacity-30"
                        >
                          <ChevronRight className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune image. Ajoute-en depuis ton ordinateur ou colle une URL.</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || form.images.length >= MAX_DRAFT_IMAGES}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus />
                  {uploading ? "Envoi…" : "Ajouter des photos"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                {uploadError ? <span className="text-xs text-destructive">{uploadError}</span> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Images expirées ou absentes du JSON : télécharge-les depuis le lien du post puis ajoute-les ici (JPG/PNG/WEBP, 10 Mo max).
              </p>

              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                  placeholder="…ou coller une URL d'image directe"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addManualImageUrl();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!manualUrl.trim() || form.images.length >= MAX_DRAFT_IMAGES}
                  onClick={addManualImageUrl}
                >
                  Ajouter l&apos;URL
                </Button>
              </div>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={save}>
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type DraftCardProps = {
  item: ApifyDraftMeta;
  index: number;
  geo: GeoState;
  canGeocode: boolean;
  onGeocode: (index: number) => void;
  imp: ImportState;
  canCreate: boolean;
  onCreate: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  isEdited: boolean;
  reelImp: ReelImportState;
  canCreateReel: boolean;
  onCreateReel: (index: number) => void;
};

function DraftCard({
  item,
  index,
  geo,
  canGeocode,
  onGeocode,
  imp,
  canCreate,
  onCreate,
  onEdit,
  onRemove,
  isEdited,
  reelImp,
  canCreateReel,
  onCreateReel,
}: DraftCardProps) {
  const { draft, warnings, reelDraft } = item;
  const location = [draft.street, draft.city, draft.province].filter(Boolean).join(", ");
  const rooms = roomsSummary(draft);
  const missingFields = visibleMissing(item);
  // Google is still useful to refine an OSM city-only match or an unresolved one.
  const canRefine = !geo.source || !RESOLVED_SOURCES.includes(geo.source);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
          {draft.typeProperty ? <Badge variant="secondary">{TYPE_LABELS[draft.typeProperty]}</Badge> : null}
          <Badge variant={draft.status === "FOR_RENT" ? "success" : "warning"}>
            {draft.status === "FOR_RENT" ? "Location" : "Vente"}
          </Badge>
          {isEdited ? <Badge variant="success">Modifiée manuellement</Badge> : null}
          <Badge variant="secondary">{draft.images.length} image(s)</Badge>
        </div>
        <h3 className="text-base font-semibold text-foreground">{draft.title || "Sans titre"}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{formatPrice(draft.price)}</span>
          {location ? <span>📍 {location}</span> : null}
          {rooms ? <span>{rooms}</span> : null}
          {draft.contact ? <span>☎ {draft.contact}</span> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Localisation */}
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs">
          {geo.source ? (
            <Badge variant={RESOLVED_SOURCES.includes(geo.source) ? "success" : "secondary"}>
              {GEO_SOURCE_LABELS[geo.source]}
            </Badge>
          ) : (
            <Badge variant="warning">Non localisé</Badge>
          )}
          {hasCoords(draft) ? (
            <span className="text-muted-foreground">
              {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} · {draft.isLocExact ? "exact" : "approx."}
            </span>
          ) : null}
          {geo.status === "error" && geo.message ? (
            <span className="text-destructive">{geo.message}</span>
          ) : null}
          {canRefine ? (
            <Button
              variant="outline"
              size="sm"
              disabled={!canGeocode || geo.status === "loading"}
              onClick={() => onGeocode(index)}
            >
              {geo.status === "loading" ? "Géolocalisation…" : "Géolocaliser (Google)"}
            </Button>
          ) : null}
        </div>

        {draft.images.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draft.images.slice(0, 8).map((image) => (
              <ImageThumb key={image.fileURL} url={image.fileURL} />
            ))}
          </div>
        ) : null}

        {/* Description générée */}
        {draft.description ? (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Description générée</p>
            <p className="whitespace-pre-line rounded-md bg-muted px-3 py-2 text-sm text-foreground">
              {draft.description}
            </p>
          </div>
        ) : null}

        {/* Texte original du post (pour vérifier le parsing) */}
        {draft.source.rawText ? (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
              Texte original du post
            </summary>
            <p className="whitespace-pre-line border-t border-border px-3 py-2 text-sm text-muted-foreground">
              {draft.source.rawText}
            </p>
          </details>
        ) : null}

        {/* Attributs du modèle */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Attributs</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {listingAttributes(draft).map((attr) => (
              <div key={attr.label} className="flex justify-between gap-2 border-b border-border py-0.5">
                <dt className="text-muted-foreground">{attr.label}</dt>
                <dd className="text-right font-medium text-foreground">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {missingFields.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-warning">À compléter :</span>
            {missingFields.map((field) => (
              <Badge key={field} variant="warning">
                {field}
              </Badge>
            ))}
          </div>
        ) : (
          <Badge variant="success">Tous les champs clés extraits</Badge>
        )}

        {warnings.map((warning) => (
          <p key={warning} className="text-xs text-muted-foreground">
            ⚠ {warning}
          </p>
        ))}

        {draft.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {draft.tags.slice(0, 12).map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {draft.source.postUrl ? (
            <a href={draft.source.postUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              Voir les photos du post
            </a>
          ) : (
            <span className="text-muted-foreground">Pas de lien direct vers le post</span>
          )}
          {draft.source.authorUrl ? (
            <a href={draft.source.authorUrl} target="_blank" rel="noreferrer" className="text-muted-foreground underline">
              Profil auteur{draft.source.authorName ? ` (${draft.source.authorName})` : ""}
            </a>
          ) : draft.source.authorName ? (
            <span className="text-muted-foreground">Auteur : {draft.source.authorName}</span>
          ) : null}
        </div>

        {/* Création de l'annonce */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {imp.status === "created" ? (
            <Badge variant="success">Annonce créée{imp.propertyId ? ` · ${imp.propertyId}` : ""}</Badge>
          ) : (
            <Button
              size="sm"
              disabled={!canCreate || imp.status === "loading"}
              onClick={() => onCreate(index)}
            >
              {imp.status === "loading" ? "Création…" : "Créer l'annonce"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={imp.status === "created" || imp.status === "loading"}
            onClick={() => onEdit(index)}
          >
            <Pencil />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => onRemove(index)}
          >
            Supprimer
          </Button>
          {imp.status === "error" && imp.error ? <span className="text-xs text-destructive">{imp.error}</span> : null}
          {!canCreate && imp.status !== "created" ? (
            <span className="text-xs text-muted-foreground">Annonceur requis (barre « Annonceur cible » en haut)</span>
          ) : null}
        </div>

        {/* Reel — orphelin si le post n'a pas d'image, sinon rattaché à l'annonce */}
        {reelDraft ? (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Vidéo détectée</Badge>
              {draft.images.length === 0 ? (
                <span className="text-xs text-muted-foreground">Post sans image — reel indépendant, sans annonce liée.</span>
              ) : imp.status === "created" ? (
                <span className="text-xs text-muted-foreground">Sera rattaché à l&apos;annonce créée.</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Sera rattaché automatiquement à la création de l&apos;annonce.
                </span>
              )}
            </div>
            {/* fbcdn video URLs expire like the photo URLs above — same caveat. */}
            <video
              src={reelDraft.videoUrl}
              controls
              className="max-h-64 w-full rounded-md bg-black"
            />
            <div className="flex flex-wrap items-center gap-2">
              {reelImp.status === "created" ? (
                <Badge variant="success">Reel créé{reelImp.reelId ? ` · ${reelImp.reelId}` : ""}</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canCreateReel || reelImp.status === "loading"}
                  onClick={() => onCreateReel(index)}
                >
                  {reelImp.status === "loading" ? "Création…" : "Créer le reel"}
                </Button>
              )}
              {reelDraft.contact ? <span className="text-xs text-muted-foreground">☎ {reelDraft.contact}</span> : null}
              {reelImp.status === "error" && reelImp.error ? (
                <span className="text-xs text-destructive">{reelImp.error}</span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Le reel sera visible après validation dans Modération &gt; Réels.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type GroupEditDialogProps = {
  group: FacebookGroupSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (groupId: string, patch: { url?: string; label?: string | null }) => Promise<void>;
};

function GroupEditDialog({ group, open, onOpenChange, onSave }: GroupEditDialogProps) {
  const [url, setUrl] = useState(group.url);
  const [label, setLabel] = useState(group.label ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(group.id, { url: url.trim(), label: label.trim() || null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le groupe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            URL du groupe
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Libellé
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="(optionnel)"
              className="rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving || !url.trim()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ApifyPage() {
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApifyPipelineResult["stats"] | null>(null);
  const [items, setItems] = useState<ApifyDraftMeta[]>([]);
  const [geo, setGeo] = useState<Record<number, GeoState>>({});
  const [imp, setImp] = useState<Record<number, ImportState>>({});
  const [reelImp, setReelImp] = useState<Record<number, ReelImportState>>({});
  const [removed, setRemoved] = useState<Record<number, boolean>>({});
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [edited, setEdited] = useState<Record<number, boolean>>({});

  // Announcer picker (listings must be attached to an announcer).
  const [announcer, setAnnouncer] = useState<AnnouncerOption | null>(null);
  const [announcerQuery, setAnnouncerQuery] = useState("");
  const [announcerQueryDebounced, setAnnouncerQueryDebounced] = useState("");
  const [importingAll, setImportingAll] = useState(false);

  // Automated scraping (POST /apify/scrape + poll) — alternative to pasting
  // JSON by hand in the textarea below.
  const [selectedGroupIds, setSelectedGroupIds] = useState<Record<string, boolean>>({});
  const [resultsLimitText, setResultsLimitText] = useState("100");
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeStartedAt, setScrapeStartedAt] = useState<number | null>(null);

  // Registre de groupes Facebook enregistrés (ajout/modification/suppression).
  const [newGroupUrl, setNewGroupUrl] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [groupFormError, setGroupFormError] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [editGroup, setEditGroup] = useState<FacebookGroupSource | null>(null);
  const [confirmRemoveGroupId, setConfirmRemoveGroupId] = useState<string | null>(null);

  const groupsQuery = useQuery({ queryKey: ["apify", "groups"], queryFn: fetchGroupSources });
  const groupsData = groupsQuery.data?.groups;
  const groups = useMemo(() => groupsData ?? [], [groupsData]);

  const osmQuery = useQuery({ queryKey: ["osm", "gabon", "selector"], queryFn: fetchOsmSelector });
  const osm = osmQuery.data ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncerQueryDebounced(announcerQuery), 300);
    return () => clearTimeout(timer);
  }, [announcerQuery]);

  const platformAnnouncersQuery = useQuery({
    queryKey: ["announcers", "platform"],
    queryFn: fetchPlatformAnnouncers,
    staleTime: 5 * 60 * 1000,
  });

  const announcerQueryResult = useQuery({
    queryKey: ["announcers", "lookup", announcerQueryDebounced],
    queryFn: () => fetchAnnouncers(announcerQueryDebounced),
    enabled: !announcer && announcerQueryDebounced.trim().length >= 2,
  });

  // Re-run OSM resolution once the dataset is loaded, for drafts still
  // unresolved (e.g. when "Transformer" was clicked before OSM finished loading).
  useEffect(() => {
    if (!osm || items.length === 0) return;
    const updates: Array<{ index: number; resolution: GeoResolution; source: GeoSource }> = [];
    items.forEach((meta, index) => {
      if (edited[index]) return;
      if (geo[index]?.status !== "none") return;
      const resolution = resolveFromOsm(meta.draft, osm);
      if (resolution) {
        updates.push({ index, resolution, source: resolution.source });
      }
    });
    if (updates.length === 0) return;
    const resolutionByIndex = new Map(updates.map((update) => [update.index, update.resolution]));
    setItems((prev) =>
      prev.map((meta, index) => {
        const resolution = resolutionByIndex.get(index);
        return resolution ? { ...meta, draft: applyResolution(meta.draft, resolution) } : meta;
      }),
    );
    setGeo((prev) => {
      const next = { ...prev };
      for (const update of updates) next[update.index] = { status: "resolved", source: update.source };
      return next;
    });
  }, [osm, items, geo, edited]);

  // Shared by the manual "Transformer" button and the auto-scrape success
  // handler below — takes the JSON as a plain argument (not read from
  // `rawJson` state) so the latter isn't tripped up by React's async state
  // updates (setRawJson + immediate use in the same tick would still see
  // the stale value otherwise).
  const applyRawJson = useCallback(
    (json: string) => {
      const parsed = parseApifyJson(json);
      if (!parsed.ok) {
        setError(parsed.error);
        setStats(null);
        setItems([]);
        setGeo({});
        return;
      }
      setError(null);
      setImp({});
      setReelImp({});
      setRemoved({});
      setEdited({});
      const result = runApifyPipeline(parsed.posts);
      setStats(result.stats);

      // Auto-resolve with the free OSM dataset when it is loaded.
      const nextGeo: Record<number, GeoState> = {};
      const nextItems = result.drafts.map((meta, index) => {
        const resolution = osm ? resolveFromOsm(meta.draft, osm) : null;
        if (resolution) {
          nextGeo[index] = { status: "resolved", source: resolution.source };
          return { ...meta, draft: applyResolution(meta.draft, resolution) };
        }
        nextGeo[index] = { status: "none" };
        return meta;
      });
      setItems(nextItems);
      setGeo(nextGeo);
    },
    [osm],
  );

  const handleTransform = useCallback(() => {
    applyRawJson(rawJson);
  }, [applyRawJson, rawJson]);

  const selectedGroupUrls = useMemo(
    () => groups.filter((group) => selectedGroupIds[group.id]).map((group) => group.url),
    [groups, selectedGroupIds],
  );

  const handleTriggerScrape = useCallback(async () => {
    if (selectedGroupUrls.length === 0) return;
    const resultsLimit = Number(resultsLimitText) || 100;

    setScrapeStatus("running");
    setScrapeError(null);
    setScrapeRunId(null);
    try {
      const { runId } = await triggerScrape(selectedGroupUrls, resultsLimit);
      setScrapeStartedAt(Date.now());
      setScrapeRunId(runId);
    } catch (cause) {
      setScrapeStatus("failed");
      setScrapeError(cause instanceof Error ? cause.message : "Échec du déclenchement.");
    }
  }, [selectedGroupUrls, resultsLimitText]);

  const handleAddGroup = useCallback(async () => {
    const url = newGroupUrl.trim();
    if (!url) return;
    setAddingGroup(true);
    setGroupFormError(null);
    try {
      const created = await createGroupSourceApi(url, newGroupLabel.trim());
      setNewGroupUrl("");
      setNewGroupLabel("");
      await groupsQuery.refetch();
      setSelectedGroupIds((prev) => ({ ...prev, [created.id]: true }));
    } catch (cause) {
      setGroupFormError(cause instanceof Error ? cause.message : "Échec de l'enregistrement.");
    } finally {
      setAddingGroup(false);
    }
  }, [newGroupUrl, newGroupLabel, groupsQuery]);

  const handleSaveGroupEdit = useCallback(
    async (groupId: string, patch: { url?: string; label?: string | null }) => {
      await updateGroupSourceApi(groupId, patch);
      await groupsQuery.refetch();
      setEditGroup(null);
    },
    [groupsQuery],
  );

  const handleConfirmRemoveGroup = useCallback(async () => {
    if (!confirmRemoveGroupId) return;
    await deleteGroupSourceApi(confirmRemoveGroupId);
    setSelectedGroupIds((prev) => {
      const next = { ...prev };
      delete next[confirmRemoveGroupId];
      return next;
    });
    setConfirmRemoveGroupId(null);
    await groupsQuery.refetch();
  }, [confirmRemoveGroupId, groupsQuery]);

  const scrapePollQuery = useQuery({
    queryKey: ["apify", "scrape", scrapeRunId],
    queryFn: () => pollScrape(scrapeRunId!),
    enabled: Boolean(scrapeRunId) && scrapeStatus === "running",
    refetchInterval: 5000,
  });

  useEffect(() => {
    const data = scrapePollQuery.data;
    if (!data || (scrapeStatus !== "running" && scrapeStatus !== "stalled")) return;

    if (data.status === "SUCCEEDED") {
      setScrapeStatus("succeeded");
      const json = JSON.stringify(data.items ?? [], null, 2);
      setRawJson(json);
      applyRawJson(json);
      return;
    }
    if (data.status === "RUNNING" || data.status === "READY") {
      if (scrapeStartedAt && Date.now() - scrapeStartedAt > SCRAPE_MAX_POLL_MS) {
        setScrapeStatus("stalled");
      }
      return;
    }
    // FAILED / TIMED-OUT / ABORTED / ABORTING
    setScrapeStatus("failed");
    setScrapeError(data.error ?? `Le run Apify s'est terminé avec le statut ${data.status}.`);
  }, [scrapePollQuery.data, scrapeStatus, scrapeStartedAt, applyRawJson]);

  // Une requête de suivi en échec ne remplit jamais `data` : sans ce second effet, l'état
  // restait "running" et le sondage repartait toutes les 5 s indéfiniment, sans qu'aucune
  // erreur ne s'affiche. Le garde-fou SCRAPE_MAX_POLL_MS ne couvrait pas ce cas, puisqu'il
  // n'est évalué que dans la branche RUNNING de l'effet ci-dessus.
  useEffect(() => {
    if (!scrapePollQuery.isError || scrapeStatus !== "running") return;

    setScrapeStatus("failed");
    setScrapeError(
      scrapePollQuery.error instanceof Error
        ? `Suivi du run impossible : ${scrapePollQuery.error.message}`
        : "Suivi du run impossible.",
    );
  }, [scrapePollQuery.isError, scrapePollQuery.error, scrapeStatus]);

  const handleClear = useCallback(() => {
    setRawJson("");
    setError(null);
    setStats(null);
    setItems([]);
    setGeo({});
    setImp({});
    setReelImp({});
    setRemoved({});
    setConfirmRemoveIndex(null);
    setEditIndex(null);
    setEdited({});
  }, []);

  const confirmRemove = useCallback(() => {
    if (confirmRemoveIndex === null) return;
    setRemoved((prev) => ({ ...prev, [confirmRemoveIndex]: true }));
    if (editIndex === confirmRemoveIndex) {
      setEditIndex(null);
    }
    setConfirmRemoveIndex(null);
  }, [confirmRemoveIndex, editIndex]);

  const saveDraftEdit = useCallback((index: number, form: DraftEditFormState) => {
    setItems((prev) =>
      prev.map((meta, currentIndex) =>
        currentIndex === index ? { ...meta, draft: applyDraftEdit(meta.draft, form) } : meta,
      ),
    );
    setEdited((prev) => ({ ...prev, [index]: true }));
    setImp((prev) => {
      if (prev[index]?.status !== "error") return prev;
      return { ...prev, [index]: { status: "idle" } };
    });
  }, []);

  // Creates the reel attached to a just-created listing (propertyId known
  // synchronously from the import result — no stale-closure risk reading it
  // back from `imp` state in the same tick).
  const createAttachedReel = useCallback(
    async (index: number, announcerUid: string, propertyId: string) => {
      const reelDraft = items[index]?.reelDraft;
      if (!reelDraft) return;
      setReelImp((prev) => ({ ...prev, [index]: { status: "loading" } }));
      try {
        const data = await importReels(announcerUid, [{ ...reelDraft, propertyId }]);
        const result = data.results[0];
        setReelImp((prev) => ({
          ...prev,
          [index]: result?.ok
            ? { status: "created", reelId: result.reelId }
            : { status: "error", error: result?.error ?? "Échec." },
        }));
      } catch (cause) {
        setReelImp((prev) => ({
          ...prev,
          [index]: { status: "error", error: cause instanceof Error ? cause.message : "Échec." },
        }));
      }
    },
    [items],
  );

  const createOne = useCallback(
    async (index: number) => {
      if (!announcer || !items[index]) return;
      setImp((prev) => ({ ...prev, [index]: { status: "loading" } }));
      try {
        const data = await importDrafts(announcer.uid, [items[index].draft]);
        const result = data.results[0];
        setImp((prev) => ({
          ...prev,
          [index]: result?.ok
            ? { status: "created", propertyId: result.propertyId }
            : { status: "error", error: result?.error ?? "Échec." },
        }));
        // Post has both images and a video → attach the reel to the listing
        // we just created, instead of leaving it orphan.
        if (result?.ok && result.propertyId && items[index].reelDraft) {
          await createAttachedReel(index, announcer.uid, result.propertyId);
        }
      } catch (cause) {
        setImp((prev) => ({
          ...prev,
          [index]: { status: "error", error: cause instanceof Error ? cause.message : "Échec." },
        }));
      }
    },
    [announcer, items, createAttachedReel],
  );

  const createAll = useCallback(async () => {
    if (!announcer) return;
    const targets = items
      .map((_, index) => index)
      .filter((index) => !removed[index] && imp[index]?.status !== "created");
    if (targets.length === 0) return;
    setImportingAll(true);
    setImp((prev) => {
      const next = { ...prev };
      for (const index of targets) next[index] = { status: "loading" };
      return next;
    });
    try {
      const data = await importDrafts(
        announcer.uid,
        targets.map((index) => items[index].draft),
      );
      setImp((prev) => {
        const next = { ...prev };
        for (const result of data.results) {
          const originalIndex = targets[result.index];
          next[originalIndex] = result.ok
            ? { status: "created", propertyId: result.propertyId }
            : { status: "error", error: result.error ?? "Échec." };
        }
        return next;
      });

      // Posts with both images and a video → attach their reel to the
      // listing just created, in the same batch spirit as the listings call.
      const reelTargets = data.results
        .filter((result) => result.ok && result.propertyId)
        .map((result) => ({ index: targets[result.index], propertyId: result.propertyId as string }))
        .filter(({ index }) => Boolean(items[index]?.reelDraft));

      if (reelTargets.length > 0) {
        setReelImp((prev) => {
          const next = { ...prev };
          for (const { index } of reelTargets) next[index] = { status: "loading" };
          return next;
        });
        try {
          const reelData = await importReels(
            announcer.uid,
            reelTargets.map(({ index, propertyId }) => ({ ...items[index].reelDraft!, propertyId })),
          );
          setReelImp((prev) => {
            const next = { ...prev };
            for (const result of reelData.results) {
              const originalIndex = reelTargets[result.index].index;
              next[originalIndex] = result.ok
                ? { status: "created", reelId: result.reelId }
                : { status: "error", error: result.error ?? "Échec." };
            }
            return next;
          });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Échec.";
          setReelImp((prev) => {
            const next = { ...prev };
            for (const { index } of reelTargets) next[index] = { status: "error", error: message };
            return next;
          });
        }
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Échec.";
      setImp((prev) => {
        const next = { ...prev };
        for (const index of targets) next[index] = { status: "error", error: message };
        return next;
      });
    } finally {
      setImportingAll(false);
    }
  }, [announcer, items, imp, removed]);

  const createReelOne = useCallback(
    async (index: number) => {
      const reelDraft = items[index]?.reelDraft;
      if (!announcer || !reelDraft) return;
      setReelImp((prev) => ({ ...prev, [index]: { status: "loading" } }));
      try {
        // Attach to the listing if it's already been created for this post
        // (order-independent: works whether the listing or the reel button
        // is clicked first).
        const existingPropertyId = imp[index]?.status === "created" ? imp[index].propertyId : undefined;
        const data = await importReels(announcer.uid, [
          existingPropertyId ? { ...reelDraft, propertyId: existingPropertyId } : reelDraft,
        ]);
        const result = data.results[0];
        setReelImp((prev) => ({
          ...prev,
          [index]: result?.ok
            ? { status: "created", reelId: result.reelId }
            : { status: "error", error: result?.error ?? "Échec." },
        }));
      } catch (cause) {
        setReelImp((prev) => ({
          ...prev,
          [index]: { status: "error", error: cause instanceof Error ? cause.message : "Échec." },
        }));
      }
    },
    [announcer, items, imp],
  );

  const createReelAll = useCallback(async () => {
    if (!announcer) return;
    const targets = items
      .map((_, index) => index)
      .filter((index) => !removed[index] && items[index].reelDraft && reelImp[index]?.status !== "created");
    if (targets.length === 0) return;
    setReelImp((prev) => {
      const next = { ...prev };
      for (const index of targets) next[index] = { status: "loading" };
      return next;
    });
    try {
      const data = await importReels(
        announcer.uid,
        targets.map((index) => {
          const reelDraft = items[index].reelDraft!;
          const existingPropertyId = imp[index]?.status === "created" ? imp[index].propertyId : undefined;
          return existingPropertyId ? { ...reelDraft, propertyId: existingPropertyId } : reelDraft;
        }),
      );
      setReelImp((prev) => {
        const next = { ...prev };
        for (const result of data.results) {
          const originalIndex = targets[result.index];
          next[originalIndex] = result.ok
            ? { status: "created", reelId: result.reelId }
            : { status: "error", error: result.error ?? "Échec." };
        }
        return next;
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Échec.";
      setReelImp((prev) => {
        const next = { ...prev };
        for (const index of targets) next[index] = { status: "error", error: message };
        return next;
      });
    }
  }, [announcer, items, imp, reelImp, removed]);

  const reelTargetCount = useMemo(
    () =>
      items.filter(
        (meta, index) => !removed[index] && meta.reelDraft && reelImp[index]?.status !== "created",
      ).length,
    [items, removed, reelImp],
  );

  const geocodeOne = useCallback(
    async (index: number) => {
      if (!osm) return;
      const meta = items[index];
      if (!meta) return;
      setGeo((prev) => ({ ...prev, [index]: { ...prev[index], status: "loading" } }));
      try {
        const payload = await geocodeBestEffort(meta.draft);
        const resolution = resolveFromGoogle(meta.draft, payload, osm);
        if (!resolution) {
          setGeo((prev) => ({ ...prev, [index]: { status: "error", message: "Aucun résultat Google." } }));
          return;
        }
        setItems((prev) =>
          prev.map((current, currentIndex) => {
            if (currentIndex !== index) return current;
            const resolvedDraft = applyResolution(current.draft, resolution);
            return {
              ...current,
              draft: edited[index]
                ? {
                    ...resolvedDraft,
                    title: current.draft.title,
                    description: current.draft.description,
                  }
                : resolvedDraft,
            };
          }),
        );
        setGeo((prev) => ({ ...prev, [index]: { status: "resolved", source: "google" } }));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Échec du géocodage.";
        setGeo((prev) => ({ ...prev, [index]: { status: "error", message } }));
      }
    },
    [edited, items, osm],
  );

  const unresolvedIndexes = useMemo(
    () =>
      items
        .map((_, index) => index)
        .filter((index) => {
          if (removed[index]) return false;
          const source = geo[index]?.source;
          return !source || !RESOLVED_SOURCES.includes(source);
        }),
    [items, geo, removed],
  );

  const geocodeAll = useCallback(async () => {
    for (const index of unresolvedIndexes) {
      await geocodeOne(index);
    }
  }, [unresolvedIndexes, geocodeOne]);

  const sortedIndexes = useMemo(
    () =>
      items
        .map((_, index) => index)
        .filter((index) => !removed[index])
        .sort((a, b) => visibleMissing(items[a]).length - visibleMissing(items[b]).length),
    [items, removed],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apify"
        description="Collez le JSON renvoyé par Apify pour épurer les posts et les transformer en brouillons d'annonces immobilières."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClear} disabled={!rawJson && items.length === 0}>
              Effacer
            </Button>
            <Button onClick={handleTransform} disabled={!rawJson.trim()}>
              Transformer
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-foreground">Scraping automatique</p>
          <p className="text-xs text-muted-foreground">
            Lance le scraper Facebook Groups directement depuis l&apos;API Apify — remplace le
            copier-coller manuel ci-dessous. Bascule automatiquement entre les comptes Apify
            configurés si l&apos;un atteint sa limite de crédit.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Groupes enregistrés</p>
            {groupsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            ) : groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun groupe enregistré — ajoute-en un ci-dessous.</p>
            ) : (
              <ul className="space-y-1">
                {groups.map((group) => (
                  <li
                    key={group.id}
                    className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(selectedGroupIds[group.id])}
                      onChange={(event) =>
                        setSelectedGroupIds((prev) => ({ ...prev, [group.id]: event.target.checked }))
                      }
                      disabled={scrapeStatus === "running"}
                    />
                    <span className="flex-1 truncate text-sm text-foreground">{group.label || group.url}</span>
                    {group.label ? (
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">{group.url}</span>
                    ) : null}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setEditGroup(group)}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmRemoveGroupId(group.id)}
                      aria-label="Supprimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              URL du groupe
              <input
                value={newGroupUrl}
                onChange={(event) => setNewGroupUrl(event.target.value)}
                placeholder="https://www.facebook.com/groups/..."
                className="w-64 rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Libellé (optionnel)
              <input
                value={newGroupLabel}
                onChange={(event) => setNewGroupLabel(event.target.value)}
                placeholder="Bons plans immo Libreville"
                className="w-56 rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <Button variant="outline" onClick={handleAddGroup} disabled={!newGroupUrl.trim() || addingGroup}>
              {addingGroup ? "Ajout…" : "Ajouter le groupe"}
            </Button>
          </div>
          {groupFormError ? <p className="text-xs text-destructive">{groupFormError}</p> : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Posts par groupe
              <input
                type="number"
                min={1}
                value={resultsLimitText}
                onChange={(event) => setResultsLimitText(event.target.value)}
                disabled={scrapeStatus === "running"}
                className="w-20 rounded-md border border-border px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <Button
              onClick={handleTriggerScrape}
              disabled={selectedGroupUrls.length === 0 || scrapeStatus === "running"}
            >
              {scrapeStatus === "running"
                ? "Scraping en cours…"
                : `Lancer le scraping (${selectedGroupUrls.length})`}
            </Button>
            {scrapeStatus === "running" ? (
              <span className="text-xs text-muted-foreground">
                Run {scrapeRunId} — ça peut prendre plusieurs minutes pour 100 posts.
              </span>
            ) : null}
            {scrapeStatus === "succeeded" ? <Badge variant="success">Résultats chargés ci-dessous</Badge> : null}
          </div>
          {scrapeStatus === "stalled" ? (
            <div className="flex items-center gap-2 text-xs text-warning">
              <span>Toujours en cours côté Apify (run {scrapeRunId}) — le run continue même si tu quittes la page.</span>
              <Button variant="outline" size="sm" onClick={() => scrapePollQuery.refetch()}>
                Vérifier maintenant
              </Button>
            </div>
          ) : null}
          {scrapeStatus === "failed" && scrapeError ? (
            <p className="text-xs text-destructive">{scrapeError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium text-foreground">JSON Apify</p>
          <p className="text-xs text-muted-foreground">
            Le tableau de posts du scraper Facebook. Les annonces ne sont pas encore enregistrées en base —
            cette étape ne fait que prévisualiser la transformation. Une vignette «&nbsp;Aperçu
            indisponible&nbsp;» ne veut pas dire que l&apos;image est perdue : soit l&apos;URL Facebook a
            fini par expirer (après plusieurs heures), soit ton réseau/VPN bloque fbcdn.net dans ce
            navigateur — dans les deux cas, «&nbsp;Créer l&apos;annonce&nbsp;» télécharge l&apos;image
            depuis le serveur et fonctionne souvent quand même.
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            spellCheck={false}
            placeholder="[ { &quot;facebookUrl&quot;: &quot;...&quot;, &quot;text&quot;: &quot;...&quot;, &quot;attachments&quot;: [...] } ]"
            className="h-48 w-full resize-y rounded-md border border-border bg-muted p-3 font-mono text-xs text-foreground focus:border-brand-500 focus:outline-none"
          />
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {stats ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Posts reçus" value={stats.totalPosts} />
          <StatTile label="Sans texte (écartés)" value={stats.droppedEmptyText} tone="muted" />
          <StatTile label="Non immobiliers (écartés)" value={stats.droppedNotRealEstate} tone="muted" />
          <StatTile label="Annonces transformées" value={stats.keptRealEstate} />
        </section>
      ) : null}

      {items.length > 0 ? (
        <Card className="sticky top-2 z-20 shadow-md">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-foreground">Annonceur cible &amp; création</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Localisation : {items.length - unresolvedIndexes.length}/{items.length} résolues localement (référentiel + OSM).
                {!osm ? " (Données OSM en cours de chargement…)" : null}
              </p>
              <Button variant="outline" onClick={geocodeAll} disabled={!osm || unresolvedIndexes.length === 0}>
                Géolocaliser le reste via Google ({unresolvedIndexes.length})
              </Button>
            </div>

            {/* Annonceur cible + création */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <div className="relative">
                {announcer ? (
                  <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                    <span className="font-medium text-foreground">{announcer.fullName}</span>
                    <span className="text-xs text-muted-foreground">{announcer.email ?? announcer.uid}</span>
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => {
                        setAnnouncer(null);
                        setAnnouncerQuery("");
                      }}
                    >
                      changer
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={announcerQuery}
                      onChange={(event) => setAnnouncerQuery(event.target.value)}
                      placeholder="Rechercher l'annonceur (nom, email)…"
                      className="w-72 rounded-md border border-border px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    {announcerQueryDebounced.trim().length >= 2 ? (
                      <div className="absolute z-10 mt-1 w-72 rounded-md border border-border bg-card shadow">
                        {announcerQueryResult.isLoading ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Recherche…</p>
                        ) : announcerQueryResult.isError ? (
                          <p className="px-3 py-2 text-xs text-destructive">
                            {(announcerQueryResult.error as Error).message}
                          </p>
                        ) : (announcerQueryResult.data?.length ?? 0) === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Aucun annonceur trouvé.</p>
                        ) : (
                          <ul className="max-h-56 overflow-auto">
                            {announcerQueryResult.data!.map((option) => (
                              <li key={option.uid}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    setAnnouncer(option);
                                    setAnnouncerQuery("");
                                  }}
                                >
                                  <span className="font-medium text-foreground">{option.fullName}</span>
                                  <span className="text-xs text-muted-foreground">{option.email ?? option.uid}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}

                    {/* Sélection rapide : les annonceurs de la plateforme sont ceux qu'on
                        attribue le plus souvent aux annonces importées. La recherche reste
                        disponible pour tous les autres comptes.

                        Le select n'est JAMAIS désactivé sur erreur : un <select disabled> ne
                        s'ouvre même pas au clic dans un navigateur, et rendait ce bug invisible
                        (un hoquet réseau au premier chargement laissait le contrôle inerte en
                        silence, sans que rien ne l'indique — constaté en prod le 2026-08-19,
                        remonté comme "rien ne se passe au clic"). Le message d'erreur réel et un
                        bouton Réessayer remplacent ce silence. */}
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Annonceur de la plateforme"
                        className="w-64 rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-60"
                        value=""
                        disabled={platformAnnouncersQuery.isLoading}
                        onChange={(event) => {
                          const picked = (platformAnnouncersQuery.data ?? []).find(
                            (option) => option.uid === event.target.value,
                          );
                          if (picked) {
                            setAnnouncer(picked);
                            setAnnouncerQuery("");
                          }
                        }}
                      >
                        <option value="">
                          {platformAnnouncersQuery.isLoading
                            ? "Chargement des annonceurs…"
                            : platformAnnouncersQuery.isError
                              ? "Erreur de chargement — voir message ci-contre"
                              : `Choisir parmi ${platformAnnouncersQuery.data?.length ?? 0} annonceurs`}
                        </option>
                        {Object.entries(PLATFORM_KIND_LABELS).map(([kind, label]) => {
                          const group = (platformAnnouncersQuery.data ?? []).filter(
                            (option) => option.kind === kind,
                          );
                          if (group.length === 0) return null;
                          return (
                            <optgroup key={kind} label={label}>
                              {group.map((option) => (
                                <option key={option.uid} value={option.uid}>
                                  {option.fullName}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      {platformAnnouncersQuery.isError ? (
                        <>
                          <span className="text-xs text-destructive">
                            {platformAnnouncersQuery.error instanceof Error
                              ? platformAnnouncersQuery.error.message
                              : "Erreur inconnue."}
                          </span>
                          <button
                            type="button"
                            onClick={() => platformAnnouncersQuery.refetch()}
                            className="text-xs text-brand-600 underline"
                          >
                            Réessayer
                          </button>
                        </>
                      ) : null}
                      {!platformAnnouncersQuery.isLoading &&
                      !platformAnnouncersQuery.isError &&
                      platformAnnouncersQuery.data?.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Aucun annonceur plateforme trouvé.
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              <Button onClick={createAll} disabled={!announcer || importingAll}>
                {importingAll ? "Création en cours…" : "Créer les annonces"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Images expirées ou prix/lieu manquant ⇒ l&apos;annonce sera signalée en échec.
              </span>
            </div>

            {reelTargetCount > 0 ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Button variant="outline" onClick={createReelAll} disabled={!announcer}>
                  Créer tous les reels ({reelTargetCount})
                </Button>
                <span className="text-xs text-muted-foreground">
                  Reels indépendants des annonces — visibles après validation dans Modération &gt; Réels.
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {stats ? (
        items.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedIndexes.map((index) => (
              <DraftCard
                key={items[index].draft.source.postUrl ?? index}
                item={items[index]}
                index={index}
                geo={geo[index] ?? { status: "none" }}
                canGeocode={Boolean(osm)}
                onGeocode={geocodeOne}
                imp={imp[index] ?? { status: "idle" }}
                canCreate={Boolean(announcer)}
                onCreate={createOne}
                onEdit={setEditIndex}
                onRemove={setConfirmRemoveIndex}
                isEdited={Boolean(edited[index])}
                reelImp={reelImp[index] ?? { status: "idle" }}
                canCreateReel={Boolean(announcer)}
                onCreateReel={createReelOne}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucune annonce immobilière détectée dans ce JSON.
            </CardContent>
          </Card>
        )
      ) : null}

      {editIndex !== null && items[editIndex] ? (
        <DraftEditDialog
          key={editIndex}
          index={editIndex}
          item={items[editIndex]}
          osm={osm}
          announcerUid={announcer?.uid}
          open={editIndex !== null}
          onOpenChange={(open) => {
            if (!open) setEditIndex(null);
          }}
          onSave={saveDraftEdit}
        />
      ) : null}

      <Dialog
        open={confirmRemoveIndex !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveIndex(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cette annonce ?</DialogTitle>
            <DialogDescription>
              {confirmRemoveIndex !== null && items[confirmRemoveIndex]
                ? `« ${items[confirmRemoveIndex].draft.title || "Sans titre"} » sera retirée de la liste et ne sera pas créée. Cette action ne supprime rien en base.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveIndex(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmRemove}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editGroup ? (
        <GroupEditDialog
          key={editGroup.id}
          group={editGroup}
          open={Boolean(editGroup)}
          onOpenChange={(open) => {
            if (!open) setEditGroup(null);
          }}
          onSave={handleSaveGroupEdit}
        />
      ) : null}

      <Dialog
        open={confirmRemoveGroupId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveGroupId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce groupe ?</DialogTitle>
            <DialogDescription>
              Il ne sera plus proposé dans la liste de sélection pour le scraping. Cette action ne
              touche aucune annonce déjà créée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveGroupId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemoveGroup}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
