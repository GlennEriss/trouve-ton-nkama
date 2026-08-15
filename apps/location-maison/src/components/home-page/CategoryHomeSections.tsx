"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import ListingCard from "@/components/listing/ListingCard";

type HomeSection = {
  id: string;
  slug: string;
  name: string;
  items: unknown[];
};

async function fetchHomeSections(): Promise<HomeSection[]> {
  const response = await fetch("/api/categories/home-sections");
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.sections) ? data.sections : [];
}

/**
 * Une section par catégorie racine active, triée par `order` (Lot 5, voir
 * docs/marketplace-multi-categories/02-page-accueil.md) — inclut "Immobilier" depuis le
 * 2026-08-15 (demande utilisateur explicite), redondant avec Tendances/Récentes/Par
 * province mais cohérent avec le rail "Mode". Ne s'affiche pas tant qu'aucune catégorie
 * n'atteint son seuil `minListingsForHomeSection` (filtré côté serveur, 0 pour Immobilier
 * donc toujours affiché dès qu'il y a une annonce) : c'est ce qui garde le rail Mode
 * invisible tant qu'il n'a pas de stock réel.
 *
 * Densité "compact" forcée pour toutes les sections (2026-08-15, demande utilisateur
 * explicite) : un seul gabarit de carte dans toute la plateforme, plutôt que le
 * `defaultDensity` par catégorie (`listing_categories/{id}.defaultDensity`, resté
 * "standard" pour Immobilier en base) qui aurait fait diverger ce rail de PropertyCard.
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
                <ListingCard property={item} density="compact" hideDate />
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
