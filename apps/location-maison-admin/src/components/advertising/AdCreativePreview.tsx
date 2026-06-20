"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Smartphone, Monitor, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AdPlacement } from "@/modules/advertising/domain/types";

/** Données minimales pour rendre l'aperçu d'une créa. */
export type AdCreativeCardData = {
  imageURL?: string;
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
};

/**
 * Ratio réservé par emplacement — identique au serving côté plateforme
 * (`location-maison` › AdCreativeCard). Garde l'aperçu fidèle au rendu réel.
 */
const PLACEMENT_ASPECT: Record<AdPlacement, string> = {
  home: "aspect-[16/9]",
  search_infeed: "aspect-[4/3]",
  immobilier_infeed: "aspect-[4/3]",
  property_detail: "aspect-[3/1]",
};

/** Carte présentationnelle — réplique fidèle du rendu plateforme. */
function AdCreativeCard({
  creative,
  placement,
  surface,
}: {
  creative: AdCreativeCardData;
  placement: AdPlacement;
  surface: "none" | "card";
}) {
  return (
    <div className={cn(surface === "card" ? "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" : "")}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sponsorisé</p>
      <div className="block overflow-hidden rounded-lg">
        {creative.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creative.imageURL}
            alt={creative.headline || "Publicité"}
            className={cn("w-full object-cover", PLACEMENT_ASPECT[placement])}
          />
        ) : (
          <div
            className={cn(
              "flex w-full items-center justify-center bg-slate-100 text-xs text-slate-400",
              PLACEMENT_ASPECT[placement],
            )}
          >
            Visuel de la publicité
          </div>
        )}
        {(creative.headline || creative.body || creative.ctaLabel) && (
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
  placements: AdPlacement[];
  className?: string;
};

/**
 * Aperçu fidèle de la publicité, replacée dans le décor de la page réelle où
 * elle s'affichera. L'admin bascule entre emplacements et entre mobile /
 * desktop avant de publier.
 */
export default function AdCreativePreview({ creative, placements, className }: AdCreativePreviewProps) {
  const available = placements.length > 0 ? placements : (["home"] as AdPlacement[]);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [active, setActive] = useState<AdPlacement>(available[0]);

  useEffect(() => {
    if (!available.includes(active)) setActive(available[0]);
  }, [available, active]);

  const surface = active === "search_infeed" || active === "immobilier_infeed" ? "card" : "none";

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {available.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
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
              <AdCreativeCard creative={creative} placement={active} surface={surface} />
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
