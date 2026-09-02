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

  // Réinitialisation complète des filtres au changement de section (demande explicite d'un
  // utilisateur constatant qu'un filtre posé sur "Toutes catégories" restait actif — invisible
  // mais toujours appliqué — après bascule vers "Immobilier" ou "Mode", et pareillement d'une
  // section à l'autre) : seule la recherche texte libre (`query`) traverse le changement de
  // section, tout le reste (province/ville/quartier/prix/surface/statut/type/tags, la feuille
  // choisie `categoryId`, les filtres d'attributs Mode `attr_<key>`) repart à zéro. Ne conserve
  // pas seulement les champs immobilier-only : un filtre générique (ex. Prix) resté actif en
  // passant de Mode à Immobilier serait tout aussi trompeur, silencieusement toujours appliqué
  // sans qu'aucun contrôle ne le montre comme actif à l'utilisateur qui vient de changer de
  // section.
  const selectCategory = (name: string) => {
    const params = new URLSearchParams();
    const query = searchParams.get("query");
    if (query) params.set("query", query);
    if (name) params.set("category", name);
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
