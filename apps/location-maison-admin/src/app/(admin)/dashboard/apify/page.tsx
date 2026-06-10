"use client";

import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit/page-header";
import { parseApifyJson } from "@/modules/apify/application/apify-parse.service";
import { runApifyPipeline } from "@/modules/apify/application/apify-transform.service";
import type { ApifyDraftMeta, ApifyListingDraft, ApifyPipelineResult } from "@/modules/apify/domain/types";

const TYPE_LABELS: Record<NonNullable<ApifyListingDraft["typeProperty"]>, string> = {
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
};

function formatPrice(price: number | null): string {
  if (price == null) return "Prix non détecté";
  return `${new Intl.NumberFormat("fr-FR").format(price)} XAF`;
}

function roomsSummary(draft: ApifyListingDraft): string {
  const parts: string[] = [];
  if (draft.nbrRooms != null) parts.push(`${draft.nbrRooms} ch.`);
  if (draft.nbrLivingRoom != null) parts.push(`${draft.nbrLivingRoom} salon`);
  if (draft.nbrKitchens != null) parts.push(`${draft.nbrKitchens} cuis.`);
  if (draft.nbrBathrooms != null) parts.push(`${draft.nbrBathrooms} douche`);
  if (draft.nbrToilets != null) parts.push(`${draft.nbrToilets} WC`);
  return parts.join(" · ");
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

function DraftCard({ item, index }: { item: ApifyDraftMeta; index: number }) {
  const { draft, missingFields, warnings } = item;
  const location = [draft.street, draft.city, draft.province].filter(Boolean).join(", ");
  const rooms = roomsSummary(draft);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
          {draft.typeProperty ? <Badge variant="neutral">{TYPE_LABELS[draft.typeProperty]}</Badge> : null}
          {draft.status ? (
            <Badge variant={draft.status === "FOR_RENT" ? "success" : "warning"}>
              {draft.status === "FOR_RENT" ? "Location" : "Vente"}
            </Badge>
          ) : null}
          <Badge variant="neutral">{draft.imageUrls.length} image(s)</Badge>
        </div>
        <h3 className="text-base font-semibold text-slate-900">{draft.title ?? "Sans titre"}</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{formatPrice(draft.price)}</span>
          {location ? <span>📍 {location}</span> : null}
          {rooms ? <span>{rooms}</span> : null}
          {draft.contact ? <span>☎ {draft.contact}</span> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {draft.imageUrls.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {draft.imageUrls.slice(0, 8).map((url) => (
              <ImageThumb key={url} url={url} />
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
            <a
              href={draft.source.postUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 underline"
            >
              Voir les photos du post
            </a>
          ) : (
            <span className="text-slate-400">Pas de lien direct vers le post</span>
          )}
          {draft.source.authorUrl ? (
            <a
              href={draft.source.authorUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 underline"
            >
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
  const [result, setResult] = useState<ApifyPipelineResult | null>(null);

  const handleTransform = useCallback(() => {
    const parsed = parseApifyJson(rawJson);
    if (!parsed.ok) {
      setError(parsed.error);
      setResult(null);
      return;
    }
    setError(null);
    setResult(runApifyPipeline(parsed.posts));
  }, [rawJson]);

  const handleClear = useCallback(() => {
    setRawJson("");
    setError(null);
    setResult(null);
  }, []);

  const stats = result?.stats;
  const sortedDrafts = useMemo(() => {
    if (!result) return [];
    // Most complete drafts first (fewest missing fields).
    return [...result.drafts].sort((a, b) => a.missingFields.length - b.missingFields.length);
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apify"
        description="Collez le JSON renvoyé par Apify pour épurer les posts et les transformer en brouillons d'annonces immobilières."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClear} disabled={!rawJson && !result}>
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

      {result ? (
        sortedDrafts.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedDrafts.map((item, index) => (
              <DraftCard key={item.draft.source.postUrl ?? index} item={item} index={index} />
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
