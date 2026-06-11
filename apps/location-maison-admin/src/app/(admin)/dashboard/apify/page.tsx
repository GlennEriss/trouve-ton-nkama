"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import { parseApifyJson } from "@/modules/apify/application/apify-parse.service";
import { runApifyPipeline } from "@/modules/apify/application/apify-transform.service";
import {
  applyResolution,
  geocodeBestEffort,
  resolveFromGoogle,
  resolveFromOsm,
  type GeoSource,
} from "@/modules/apify/application/apify-geocode.service";
import type { ApifyDraftMeta, ApifyListingDraft, ApifyPipelineResult } from "@/modules/apify/domain/types";
import type { TypeProperty } from "@/modules/apify/domain/platform-listing";
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
    if (field === "Ville") return !draft.city;
    if (field === "Quartier") return !draft.street;
    if (field === "Coordonnées GPS") return !hasCoords(draft);
    return true;
  });
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

type DraftCardProps = {
  item: ApifyDraftMeta;
  index: number;
  geo: GeoState;
  canGeocode: boolean;
  onGeocode: (index: number) => void;
};

function DraftCard({ item, index, geo, canGeocode, onGeocode }: DraftCardProps) {
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
            <a href={draft.source.postUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">
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

  const osmQuery = useQuery({ queryKey: ["osm", "gabon", "selector"], queryFn: fetchOsmSelector });
  const osm = osmQuery.data ?? null;

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
  }, []);

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
          prev.map((current, currentIndex) =>
            currentIndex === index ? { ...current, draft: applyResolution(current.draft, resolution) } : current,
          ),
        );
        setGeo((prev) => ({ ...prev, [index]: { status: "resolved", source: "google" } }));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Échec du géocodage.";
        setGeo((prev) => ({ ...prev, [index]: { status: "error", message } }));
      }
    },
    [items, osm],
  );

  const unresolvedIndexes = useMemo(
    () =>
      items
        .map((_, index) => index)
        .filter((index) => {
          const source = geo[index]?.source;
          return !source || !RESOLVED_SOURCES.includes(source);
        }),
    [items, geo],
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
        .sort((a, b) => visibleMissing(items[a]).length - visibleMissing(items[b]).length),
    [items],
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Localisation : {items.length - unresolvedIndexes.length}/{items.length} résolues localement (référentiel + OSM).
            {!osm ? " (Données OSM en cours de chargement…)" : null}
          </p>
          <Button
            variant="outline"
            onClick={geocodeAll}
            disabled={!osm || unresolvedIndexes.length === 0}
          >
            Géolocaliser le reste via Google ({unresolvedIndexes.length})
          </Button>
        </div>
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
    </div>
  );
}
