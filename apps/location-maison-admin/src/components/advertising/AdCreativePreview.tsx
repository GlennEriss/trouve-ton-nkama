"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Smartphone, Monitor, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdPlacement } from "@/modules/advertising/domain/types";

/** Données minimales pour rendre l'aperçu d'une créa. */
export type AdCreativeCardData = {
  imageURL?: string;
  /** Vidéo (reels_infeed uniquement) — prioritaire sur imageURL si présente. */
  videoURL?: string;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  home: "Accueil",
  search_infeed: "Recherche",
  property_detail: "Détail annonce",
  immobilier_infeed: "Immobilier",
  reels_infeed: "Réels",
};

/**
 * Hauteur fixe réservée par emplacement — identique au serving côté plateforme
 * (`location-maison` › AdCreativeCard). Une hauteur fixe (et non un aspect-ratio)
 * évite que les slots in-feed pleine largeur explosent en hauteur.
 */
const PLACEMENT_MEDIA: Record<AdPlacement, string> = {
  home: "aspect-[16/6]",
  search_infeed: "aspect-[16/5]",
  immobilier_infeed: "aspect-[16/5]",
  property_detail: "aspect-[16/4]",
  reels_infeed: "aspect-[4/5]",
};

/**
 * Carte présentationnelle — réplique fidèle du rendu plateforme.
 * `object-contain` : le visuel entier reste visible (jamais rogné). `fillHeight`
 * = hero accueil (remplit la hauteur sur dégradé, sans bloc texte).
 */
function AdCreativeCard({
  creative,
  placement,
  surface,
  fillHeight = false,
}: {
  creative: AdCreativeCardData;
  placement: AdPlacement;
  surface: "none" | "card";
  fillHeight?: boolean;
}) {
  const imageClassName = fillHeight
    ? "h-full w-full object-contain"
    : cn("w-full bg-slate-50 object-contain", PLACEMENT_MEDIA[placement]);

  return (
    <div
      className={cn(
        "relative",
        fillHeight && "h-full",
        surface === "card" ? "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" : "",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide text-slate-400",
          fillHeight ? "absolute left-2 top-2 z-10" : "mb-2",
        )}
      >
        Sponsorisé
      </p>
      <div className={cn("block overflow-hidden rounded-lg", fillHeight && "h-full")}>
        {creative.videoURL ? (
          // Pas de poster : pas de retraitement V1 côté pub, pas de miniature
          // générée — limitation assumée (mirror exact de AdCreativeCard côté app).
          <video src={creative.videoURL} className={imageClassName} muted autoPlay loop playsInline />
        ) : creative.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creative.imageURL} alt={creative.headline || "Publicité"} className={imageClassName} />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-slate-100 text-xs text-slate-400",
              fillHeight ? "h-full" : PLACEMENT_MEDIA[placement],
            )}
          >
            Visuel de la publicité
          </div>
        )}
        {!fillHeight && (creative.headline || creative.body || creative.ctaLabel) && (
          <div className="p-3">
            {creative.headline && <p className="font-semibold text-[#224D62]">{creative.headline}</p>}
            {creative.body && <p className="text-sm text-slate-600">{creative.body}</p>}
            {creative.ctaLabel && (
              <span className="mt-2 inline-block rounded-full bg-[#1FA89B] px-4 py-1.5 text-sm font-medium text-white">
                {creative.ctaLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Fausse carte d'annonce immobilière (contexte autour de la pub). */
function GhostCard() {
  return (
    <div className="space-y-1.5">
      <div className="aspect-[4/3] w-full rounded bg-slate-200" />
      <div className="h-2 w-3/4 rounded bg-slate-200" />
      <div className="h-2 w-1/2 rounded bg-slate-200" />
    </div>
  );
}

function GhostGrid({ cols }: { cols: number }) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {Array.from({ length: cols }).map((_, i) => (
        <GhostCard key={i} />
      ))}
    </div>
  );
}

/** Habille la pub du décor de la page réelle où elle s'affichera. */
function PreviewContext({
  placement,
  device,
  children,
}: {
  placement: AdPlacement;
  device: "mobile" | "desktop";
  children: ReactNode;
}) {
  const cols = device === "desktop" ? 3 : 2;

  if (placement === "search_infeed" || placement === "immobilier_infeed") {
    return (
      <div className="space-y-3">
        <GhostGrid cols={cols} />
        {children}
        <GhostGrid cols={cols} />
      </div>
    );
  }

  if (placement === "property_detail") {
    return (
      <div className="space-y-3">
        <div className="aspect-[16/9] w-full rounded bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-200" />
        <div className="h-2 w-1/2 rounded bg-slate-200" />
        {children}
        <div className="h-2 w-1/3 rounded bg-slate-200" />
        <GhostGrid cols={2} />
      </div>
    );
  }

  if (placement === "reels_infeed") {
    // Réplique le décor réel du fil réels (ReelAdSlide.tsx, apps/location-maison) :
    // fond noir plein cadre + pastille "Publicité" — pas le décor "accueil".
    return (
      <div className="relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
        <p className="absolute left-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70 backdrop-blur-sm">
          Publicité
        </p>
        {children}
      </div>
    );
  }

  // home
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-slate-200" />
        <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <div className="h-2 w-1/3 rounded bg-slate-200" />
        </div>
      </div>
      {children}
      <GhostGrid cols={2} />
    </div>
  );
}

type AdCreativePreviewProps = {
  creative: AdCreativeCardData;
  /** Visuels adaptés par emplacement (override du visuel par défaut). */
  assets?: Partial<Record<AdPlacement, { imageURL?: string; videoURL?: string }>>;
  placements: AdPlacement[];
  className?: string;
};

/**
 * Aperçu fidèle de la publicité, replacée dans le décor de la page réelle où
 * elle s'affichera. L'admin bascule entre emplacements et entre mobile /
 * desktop avant de publier.
 */
export default function AdCreativePreview({ creative, assets, placements, className }: AdCreativePreviewProps) {
  const available = useMemo(
    () => (placements.length > 0 ? placements : (["home"] as AdPlacement[])),
    [placements],
  );
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [selected, setSelected] = useState<AdPlacement | null>(null);
  // Emplacement actif dérivé : la sélection si elle est encore disponible, sinon le 1er.
  const active = selected && available.includes(selected) ? selected : available[0];

  const surface = active === "search_infeed" || active === "immobilier_infeed" ? "card" : "none";

  // Visuel adapté à l'emplacement affiché, sinon le visuel par défaut.
  const shownCreative: AdCreativeCardData = {
    ...creative,
    imageURL: assets?.[active]?.imageURL || creative.imageURL,
    videoURL: assets?.[active]?.videoURL || creative.videoURL,
  };

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {available.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelected(p)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                active === p
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500 hover:border-emerald-300",
              )}
            >
              {PLACEMENT_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white p-1">
          <button
            type="button"
            aria-label="Aperçu mobile"
            onClick={() => setDevice("mobile")}
            className={cn("rounded-full p-1.5", device === "mobile" ? "bg-emerald-50 text-emerald-600" : "text-slate-400")}
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Aperçu desktop"
            onClick={() => setDevice("desktop")}
            className={cn("rounded-full p-1.5", device === "desktop" ? "bg-emerald-50 text-emerald-600" : "text-slate-400")}
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className={cn(
            "w-full rounded-xl bg-white p-3 shadow-sm transition-all",
            device === "mobile" ? "max-w-[360px]" : "max-w-[680px]",
          )}
        >
          <PreviewContext placement={active} device={device}>
            {/* La vraie pub, mise en valeur dans le flux fantôme. */}
            <div className="rounded-lg ring-2 ring-emerald-400/50">
              {active === "home" ? (
                // Hero accueil : bannière large sur dégradé, visuel entier (contain).
                <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-linear-to-r from-[#C1DEE8] to-[#FBD9B9]">
                  <AdCreativeCard creative={shownCreative} placement="home" surface="none" fillHeight />
                </div>
              ) : active === "reels_infeed" ? (
                // Carte centrée sur fond noir — identique au rendu réel ReelAdSlide.tsx.
                <div className="w-[85%] max-w-sm">
                  <AdCreativeCard creative={shownCreative} placement="reels_infeed" surface="card" />
                </div>
              ) : (
                <AdCreativeCard creative={shownCreative} placement={active} surface={surface} />
              )}
            </div>
          </PreviewContext>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        Aperçu indicatif — les blocs gris simulent le contenu de la page ; le rendu réel s&apos;adapte à chaque écran.
      </p>
    </div>
  );
}
