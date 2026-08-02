"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import type { ApifyDraftMeta, ApifyListingDraft, ApifyPipelineResult } from "@/modules/apify/domain/types";
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
type GeoState = { status: GeoStatus; source?: GeoSource; message?: string };

type ImportStatus = "idle" | "loading" | "created" | "error";
type ImportState = { status: ImportStatus; propertyId?: string; error?: string };

type AnnouncerOption = { uid: string; fullName: string; email: string | null; phoneNumbers: string[] };

type ImportResult = { index: number; ok: boolean; propertyId?: string; imageCount: number; error?: string };

type DraftEditFormState = {
  title: string;
  description: string;
  typeProperty: TypeProperty | "";
  status: StatusProperty;
  price: string;
  area: string;
  tags: string;
  images: string;
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
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none";
const labelClass = "space-y-1 text-xs font-medium text-slate-600";

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
    images: draft.images.map((image) => image.fileURL).join("\n"),
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
    images: parseList(form.images)
      .slice(0, 10)
      .map((fileURL) => ({ fileURL, filePATH: "" })),
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
      <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-1 text-center text-[10px] leading-tight text-slate-400">
        Image expirée
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
      className="h-20 w-20 rounded-md border border-slate-200 object-cover"
      loading="lazy"
    />
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "muted" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className={tone === "muted" ? "text-xs text-slate-400" : "text-xs text-slate-600"}>{label}</p>
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
  open,
  onOpenChange,
  onSave,
}: {
  index: number;
  item: ApifyDraftMeta;
  osm: GabonOsmSelectorData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (index: number, form: DraftEditFormState) => void;
}) {
  const [form, setForm] = useState<DraftEditFormState>(() => draftToEditForm(item.draft));

  const setField = <K extends keyof DraftEditFormState>(key: K, value: DraftEditFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contenu</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Localisation</p>
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
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.isLocExact}
                    onChange={(event) => setField("isLocExact", event.target.checked)}
                  />
                  Position exacte
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Détails</p>
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
              <label className="flex items-end gap-2 pb-2 text-xs font-medium text-slate-600">
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Médias & tags</p>
            <label className={labelClass}>
              Tags
              <input
                className={inputClass}
                value={form.tags}
                onChange={(event) => setField("tags", event.target.value)}
                placeholder="tag 1, tag 2"
              />
            </label>
            <label className={labelClass}>
              URLs d&apos;images
              <textarea
                className={`${inputClass} min-h-24 resize-y font-mono text-xs`}
                value={form.images}
                onChange={(event) => setField("images", event.target.value)}
              />
            </label>
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
};

function DraftCard({ item, index, geo, canGeocode, onGeocode, imp, canCreate, onCreate, onEdit, onRemove, isEdited }: DraftCardProps) {
  const { draft, warnings } = item;
  const location = [draft.street, draft.city, draft.province].filter(Boolean).join(", ");
  const rooms = roomsSummary(draft);
  const missingFields = visibleMissing(item);
  // Google is still useful to refine an OSM city-only match or an unresolved one.
  const canRefine = !geo.source || !RESOLVED_SOURCES.includes(geo.source);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
          {draft.typeProperty ? <Badge variant="neutral">{TYPE_LABELS[draft.typeProperty]}</Badge> : null}
          <Badge variant={draft.status === "FOR_RENT" ? "success" : "warning"}>
            {draft.status === "FOR_RENT" ? "Location" : "Vente"}
          </Badge>
          {isEdited ? <Badge variant="success">Modifiée manuellement</Badge> : null}
          <Badge variant="neutral">{draft.images.length} image(s)</Badge>
        </div>
        <h3 className="text-base font-semibold text-slate-900">{draft.title || "Sans titre"}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{formatPrice(draft.price)}</span>
          {location ? <span>📍 {location}</span> : null}
          {rooms ? <span>{rooms}</span> : null}
          {draft.contact ? <span>☎ {draft.contact}</span> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Localisation */}
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs">
          {geo.source ? (
            <Badge variant={RESOLVED_SOURCES.includes(geo.source) ? "success" : "neutral"}>
              {GEO_SOURCE_LABELS[geo.source]}
            </Badge>
          ) : (
            <Badge variant="warning">Non localisé</Badge>
          )}
          {hasCoords(draft) ? (
            <span className="text-slate-500">
              {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)} · {draft.isLocExact ? "exact" : "approx."}
            </span>
          ) : null}
          {geo.status === "error" && geo.message ? (
            <span className="text-red-600">{geo.message}</span>
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
            <p className="mb-1 text-xs font-medium text-slate-500">Description générée</p>
            <p className="whitespace-pre-line rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {draft.description}
            </p>
          </div>
        ) : null}

        {/* Texte original du post (pour vérifier le parsing) */}
        {draft.source.rawText ? (
          <details className="rounded-md border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-500">
              Texte original du post
            </summary>
            <p className="whitespace-pre-line border-t border-slate-100 px-3 py-2 text-sm text-slate-600">
              {draft.source.rawText}
            </p>
          </details>
        ) : null}

        {/* Attributs du modèle */}
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Attributs</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {listingAttributes(draft).map((attr) => (
              <div key={attr.label} className="flex justify-between gap-2 border-b border-slate-100 py-0.5">
                <dt className="text-slate-500">{attr.label}</dt>
                <dd className="text-right font-medium text-slate-800">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {missingFields.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-amber-700">À compléter :</span>
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
          <p key={warning} className="text-xs text-slate-500">
            ⚠ {warning}
          </p>
        ))}

        {draft.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {draft.tags.slice(0, 12).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
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
            <span className="text-slate-400">Pas de lien direct vers le post</span>
          )}
          {draft.source.authorUrl ? (
            <a href={draft.source.authorUrl} target="_blank" rel="noreferrer" className="text-slate-500 underline">
              Profil auteur{draft.source.authorName ? ` (${draft.source.authorName})` : ""}
            </a>
          ) : draft.source.authorName ? (
            <span className="text-slate-500">Auteur : {draft.source.authorName}</span>
          ) : null}
        </div>

        {/* Création de l'annonce */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
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
            className="text-red-600"
            onClick={() => onRemove(index)}
          >
            Supprimer
          </Button>
          {imp.status === "error" && imp.error ? <span className="text-xs text-red-600">{imp.error}</span> : null}
          {!canCreate && imp.status !== "created" ? (
            <span className="text-xs text-slate-400">Annonceur requis (barre « Annonceur cible » en haut)</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApifyPage() {
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ApifyPipelineResult["stats"] | null>(null);
  const [items, setItems] = useState<ApifyDraftMeta[]>([]);
  const [geo, setGeo] = useState<Record<number, GeoState>>({});
  const [imp, setImp] = useState<Record<number, ImportState>>({});
  const [removed, setRemoved] = useState<Record<number, boolean>>({});
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [edited, setEdited] = useState<Record<number, boolean>>({});

  // Announcer picker (listings must be attached to an announcer).
  const [announcer, setAnnouncer] = useState<AnnouncerOption | null>(null);
  const [announcerQuery, setAnnouncerQuery] = useState("");
  const [announcerQueryDebounced, setAnnouncerQueryDebounced] = useState("");
  const [importingAll, setImportingAll] = useState(false);

  const osmQuery = useQuery({ queryKey: ["osm", "gabon", "selector"], queryFn: fetchOsmSelector });
  const osm = osmQuery.data ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncerQueryDebounced(announcerQuery), 300);
    return () => clearTimeout(timer);
  }, [announcerQuery]);

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

  const handleTransform = useCallback(() => {
    const parsed = parseApifyJson(rawJson);
    if (!parsed.ok) {
      setError(parsed.error);
      setStats(null);
      setItems([]);
      setGeo({});
      return;
    }
    setError(null);
    setImp({});
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
  }, [rawJson, osm]);

  const handleClear = useCallback(() => {
    setRawJson("");
    setError(null);
    setStats(null);
    setItems([]);
    setGeo({});
    setImp({});
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
      } catch (cause) {
        setImp((prev) => ({
          ...prev,
          [index]: { status: "error", error: cause instanceof Error ? cause.message : "Échec." },
        }));
      }
    },
    [announcer, items],
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
          <p className="text-sm font-medium text-slate-900">JSON Apify</p>
          <p className="text-xs text-slate-500">
            Le tableau de posts du scraper Facebook. Les annonces ne sont pas encore enregistrées en base —
            cette étape ne fait que prévisualiser la transformation. Les URLs d&apos;images Facebook expirent
            au bout de quelques heures : utilisez un export récent, sinon les miniatures s&apos;afficheront comme
            «&nbsp;expirées&nbsp;».
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            spellCheck={false}
            placeholder="[ { &quot;facebookUrl&quot;: &quot;...&quot;, &quot;text&quot;: &quot;...&quot;, &quot;attachments&quot;: [...] } ]"
            className="h-48 w-full resize-y rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
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
            <p className="text-sm font-medium text-slate-900">Annonceur cible &amp; création</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Localisation : {items.length - unresolvedIndexes.length}/{items.length} résolues localement (référentiel + OSM).
                {!osm ? " (Données OSM en cours de chargement…)" : null}
              </p>
              <Button variant="outline" onClick={geocodeAll} disabled={!osm || unresolvedIndexes.length === 0}>
                Géolocaliser le reste via Google ({unresolvedIndexes.length})
              </Button>
            </div>

            {/* Annonceur cible + création */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <div className="relative">
                {announcer ? (
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm">
                    <span className="font-medium text-slate-800">{announcer.fullName}</span>
                    <span className="text-xs text-slate-400">{announcer.email ?? announcer.uid}</span>
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
                      className="w-72 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    {announcerQueryDebounced.trim().length >= 2 ? (
                      <div className="absolute z-10 mt-1 w-72 rounded-md border border-slate-200 bg-white shadow">
                        {announcerQueryResult.isLoading ? (
                          <p className="px-3 py-2 text-xs text-slate-400">Recherche…</p>
                        ) : announcerQueryResult.isError ? (
                          <p className="px-3 py-2 text-xs text-red-600">
                            {(announcerQueryResult.error as Error).message}
                          </p>
                        ) : (announcerQueryResult.data?.length ?? 0) === 0 ? (
                          <p className="px-3 py-2 text-xs text-slate-400">Aucun annonceur trouvé.</p>
                        ) : (
                          <ul className="max-h-56 overflow-auto">
                            {announcerQueryResult.data!.map((option) => (
                              <li key={option.uid}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                                  onClick={() => {
                                    setAnnouncer(option);
                                    setAnnouncerQuery("");
                                  }}
                                >
                                  <span className="font-medium text-slate-800">{option.fullName}</span>
                                  <span className="text-xs text-slate-400">{option.email ?? option.uid}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <Button onClick={createAll} disabled={!announcer || importingAll}>
                {importingAll ? "Création en cours…" : "Créer les annonces"}
              </Button>
              <span className="text-xs text-slate-400">
                Images expirées ou prix/lieu manquant ⇒ l&apos;annonce sera signalée en échec.
              </span>
            </div>
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
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
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
    </div>
  );
}
