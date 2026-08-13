"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import ListingCard from "@/components/listing/ListingCard";
import type { ListingCardDensity } from "@/components/listing/ListingCard";

type HomeSection = {
  id: string;
  slug: string;
  name: string;
  density: ListingCardDensity;
  items: unknown[];
};

async function fetchHomeSections(): Promise<HomeSection[]> {
  const response = await fetch("/api/categories/home-sections");
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.sections) ? data.sections : [];
}

/**
 * Une section par catégorie racine active (hors immobilier, qui a déjà ses sections
 * dédiées) — Lot 5, voir docs/marketplace-multi-categories/02-page-accueil.md. Ne
 * s'affiche pas tant qu'aucune catégorie n'atteint son seuil `minListingsForHomeSection`
 * (filtré côté serveur) : c'est ce qui garde l'accueil identique à aujourd'hui tant que
 * Mode n'a pas de stock réel.
 */
export default function CategoryHomeSections() {
  const { data: sections = [] } = useQuery({
    queryKey: ["categories", "home-sections"],
    queryFn: fetchHomeSections,
    staleTime: 1000 * 60 * 5,
  });

  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <section key={section.id} className="space-y-5 p-5 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-primary">
              {section.name}
            </h2>
            <Link
              href={`/search?category=${encodeURIComponent(section.name)}`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
            {section.items.map((item: any) => (
              <div key={item.id} className="min-w-[220px] max-w-[220px] snap-start">
                <ListingCard property={item} density={section.density} hideDate />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
