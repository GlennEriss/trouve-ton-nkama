"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type ActiveCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  order: number;
};

// Champs qui n'existent que sur une annonce immobilier (typeProperty) — leurs contrôles
// disparaissent de l'UI dès qu'on quitte "Immobilier"/"Toutes catégories" (voir
// useIsImmobilierSearchScope, FilterSearchDesktopPageSection, FilterModalHomePage). Sans ce
// nettoyage, un filtre laissé actif (ex. minArea) continuait de s'appliquer à une recherche
// Mode sans qu'aucun contrôle visible n'explique pourquoi les résultats étaient vides.
const IMMOBILIER_ONLY_PARAMS = ['province', 'street', 'status', 'minArea', 'maxArea', 'typeProperty'] as const;

async function fetchActiveCategories(): Promise<ActiveCategory[]> {
  const response = await fetch("/api/categories/active");
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.categories) ? data.categories : [];
}

/**
 * Sélecteur de catégorie racine (Lot 4). Ne s'affiche pas tant qu'il n'y a pas au moins
 * 2 catégories racine actives — aujourd'hui seule "Immobilier" l'est, choisir entre une
 * seule option n'a aucun sens et ça garde la page de recherche identique à avant tant que
 * Mode n'est pas activé (voir docs/marketplace-multi-categories/07-lots-et-sequencement.md).
 */
export default function CategoryFilterPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") ?? "";

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "active-roots"],
    queryFn: fetchActiveCategories,
    staleTime: 1000 * 60 * 10,
  });

  if (categories.length < 2) {
    return null;
  }

  const selectCategory = (name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (name) {
      params.set("category", name);
    } else {
      params.delete("category");
    }
    // Change de racine : la feuille choisie (categoryId) et ses filtres d'attributs
    // (attr_<key>) n'ont plus de sens pour une autre racine — même geste que
    // CategoryLeafFilterPills au changement de feuille.
    params.delete("categoryId");
    for (const key of Array.from(params.keys())) {
      if (key.startsWith("attr_")) params.delete(key);
    }
    for (const key of IMMOBILIER_ONLY_PARAMS) {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  };

  const pillClass = (isActive: boolean) =>
    cn(
      "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
      isActive
        ? "bg-primary text-white border-primary"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-primary",
    );

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filtrer par catégorie">
      <button type="button" className={pillClass(!currentCategory)} onClick={() => selectCategory("")}>
        Toutes catégories
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={pillClass(currentCategory === category.name)}
          onClick={() => selectCategory(category.name)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
