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

// Valeur de `category` réservée aux demandes de recherche (SearchDesktopPage/SearchMobilePage
// s'en servent pour basculer tout le panneau de résultats vers SearchRequestsListClient).
// Volontairement PAS un document `listing_categories` (voir fetchActiveCategories ci-dessus) :
// une demande de recherche est un contenu acheteur (collection Firestore `search_requests`,
// hors index Algolia), pas une annonce vendeur — l'ajouter à cette collection la ferait
// apparaître dans l'agrégat "Toutes catégories", qui ne doit rester qu'Immobilier + Mode
// (demande explicite de l'utilisateur). D'où ce pill codé en dur, séparé de `categories`.
export const DEMANDES_CATEGORY_NAME = "Demandes";

/**
 * Sélecteur de catégorie racine (Lot 4) + le pill fixe "Demandes" ci-dessus. S'affiche dès
 * qu'il y a au moins une option réelle à choisir face à "Demandes" — avant l'ajout de ce pill,
 * la rangée entière restait masquée tant qu'une seule catégorie (Immobilier) était active,
 * choisir entre une seule option n'ayant aucun sens ; "Demandes" est désormais toujours une
 * vraie option, donc la rangée a toujours au moins 2 choix utiles (elle ne se limitait qu'à
 * Toutes catégories/Immobilier/Mode avant, voir
 * docs/marketplace-multi-categories/07-lots-et-sequencement.md).
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
      <button
        type="button"
        className={pillClass(currentCategory === DEMANDES_CATEGORY_NAME)}
        onClick={() => selectCategory(DEMANDES_CATEGORY_NAME)}
      >
        {DEMANDES_CATEGORY_NAME}
      </button>
    </div>
  );
}
