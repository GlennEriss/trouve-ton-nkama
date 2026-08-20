"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PublishableCategoryLeaf } from "@/app/api/categories/publishable-leaves/route";

async function fetchPublishableLeaves(): Promise<PublishableCategoryLeaf[]> {
  const response = await fetch("/api/categories/publishable-leaves");
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.leaves) ? data.leaves : [];
}

/**
 * Sélecteur de feuille (Vêtements/Chaussures/Parfums & beauté/Accessoires...), visible
 * seulement quand une catégorie racine hors immobilier est active (`category` dans l'URL).
 * Nécessaire techniquement, pas seulement ergonomiquement : les feuilles d'une même racine
 * partagent des clés d'attribut (marque, etat) avec des enums différents ou ambigus —
 * CategoryAttributeFilters a besoin du `categoryId` choisi ici pour scoper correctement ses
 * requêtes de facettes Algolia (voir useAlgoliaCategoryAttributeOptions).
 *
 * Même pattern URL-first que CategoryFilterPills : lit/écrit directement l'URL, aucun state
 * partagé. Au changement de feuille, purge tous les `attr_<key>` existants — un filtre
 * "Taille" n'a aucun sens une fois basculé sur "Chaussures".
 */
export default function CategoryLeafFilterPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") ?? "";
  const currentCategoryId = searchParams.get("categoryId") ?? "";

  const { data: leaves = [] } = useQuery({
    queryKey: ["categories", "publishable-leaves"],
    queryFn: fetchPublishableLeaves,
    staleTime: 1000 * 60 * 10,
  });

  // N'a de sens que pour la catégorie active — l'immobilier garde son propre panneau
  // "Types d'annonces" (typeProperty), déjà existant, non concerné ici.
  const relevantLeaves = leaves.filter((leaf) => leaf.rootName === currentCategory);

  if (!currentCategory || relevantLeaves.length < 2) {
    return null;
  }

  const selectLeaf = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId) {
      params.set("categoryId", categoryId);
    } else {
      params.delete("categoryId");
    }
    for (const key of Array.from(params.keys())) {
      if (key.startsWith("attr_")) params.delete(key);
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
    <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filtrer par type d'article">
      <button type="button" className={pillClass(!currentCategoryId)} onClick={() => selectLeaf("")}>
        Tout {currentCategory}
      </button>
      {relevantLeaves.map((leaf) => (
        <button
          key={leaf.id}
          type="button"
          className={pillClass(currentCategoryId === leaf.id)}
          onClick={() => selectLeaf(leaf.id)}
        >
          {leaf.name}
        </button>
      ))}
    </div>
  );
}
