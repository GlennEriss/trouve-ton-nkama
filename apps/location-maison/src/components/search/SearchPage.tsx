"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation"; // Next.js 13
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import PropertyCard from "../home-page/PropertyCard";
import AlgoliaRefinements from "@/providers/AlgoliaRefinements";
import { useHits } from "react-instantsearch";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const { items } = useHits();

  const {
    // Champs et setters pour les filtres
    city,
    setCity,
    street,
    setStreet,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,
    minNbrRooms,
    setMinNbrRooms,
    maxNbrRooms,
    setMaxNbrRooms,
    typeProperty,
    setTypeProperty,
    tags,
    setTags,
    // Autres données du contexte (si nécessaire)
    filteredResults,
    setFilteredResults,
  } = useAlgoliaContext();

  const { applyRefinements } = AlgoliaRefinements();

  // Affichage des résultats dans la console pour le debug
  /* useEffect(() => {
    console.log("Résultats filtrés (hits) :", items);
  }, [items]); */

  /**
   * Parse l'URL, met à jour les filtres dans le contexte avec des valeurs par défaut si aucun filtre n'est présent,
   * puis appelle applyRefinements() qui activera ou désactivera les filtres en fonction des valeurs.
   * En l'absence de filtres, tous les items seront affichés.
   */
  useEffect(() => {
    // Récupération des paramètres depuis l'URL
    const cityVal = searchParams.get("city");
    const streetVal = searchParams.get("street");
    const minPriceVal = searchParams.get("minPrice");
    const maxPriceVal = searchParams.get("maxPrice");
    const minAreaVal = searchParams.get("minArea");
    const maxAreaVal = searchParams.get("maxArea");
    const minRoomsVal = searchParams.get("minNbrRooms");
    const maxRoomsVal = searchParams.get("maxNbrRooms");
    const typePropertyVal = searchParams.get("typeProperty"); // ex: "Studio,Maison"
    const tagsVal = searchParams.get("tags"); // ex: "Piscine,Parking"

    // Mise à jour du contexte avec des valeurs par défaut si aucun paramètre n'est présent
    setCity(cityVal ?? "");
    setStreet(streetVal ?? "");
    setMinPrice(minPriceVal ?? "");
    setMaxPrice(maxPriceVal ?? "");
    setMinArea(minAreaVal ?? "");
    setMaxArea(maxAreaVal ?? "");
    setMinNbrRooms(minRoomsVal ?? "");
    setMaxNbrRooms(maxRoomsVal ?? "");
    setTypeProperty(typePropertyVal ? typePropertyVal.split(",") : []);
    setTags(tagsVal ? tagsVal.split(",") : []);

    // Appeler inconditionnellement applyRefinements()
    // Si aucune valeur n'est définie dans le contexte, applyRefinements désactive les filtres existants,
    // ce qui revient à afficher tous les items.
    applyRefinements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen mb-20">
      {/* Titre */}
      <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
        Trouvez votre chez-vous
      </h1>

      {/* Grille de propriétés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((propertyData, index) => (
          <PropertyCard key={index} property={propertyData} index={index} />
        ))}
      </div>
    </div>
  );
}
