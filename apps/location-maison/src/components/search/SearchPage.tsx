"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useHits, useRefinementList, useConfigure, useSearchBox } from "react-instantsearch";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import PropertyCard from "../home-page/PropertyCard";

export default function SearchPage() {
  const searchParams = useSearchParams();

  // 1. destructuration du contexte
  const {
    searchText, setSearchText,
    city, setCity,
    street, setStreet,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    minArea, setMinArea,
    maxArea, setMaxArea,
    minNbrRooms, setMinNbrRooms,
    maxNbrRooms, setMaxNbrRooms,
    typeProperty, setTypeProperty,
    tags, setTags,
    //clearFilters
  } = useAlgoliaContext();

  // 2. Au montage, lire l'URL et initialiser le contexte
  useEffect(() => {
    const queryVal = searchParams.get("query") ?? "";
    const cityVal = searchParams.get("city") ?? "";
    const streetVal = searchParams.get("street") ?? "";
    const minPriceVal = searchParams.get("minPrice") ?? "";
    const maxPriceVal = searchParams.get("maxPrice") ?? "";
    const minAreaVal = searchParams.get("minArea") ?? "";
    const maxAreaVal = searchParams.get("maxArea") ?? "";
    const minRoomsVal = searchParams.get("minNbrRooms") ?? "";
    const maxRoomsVal = searchParams.get("maxNbrRooms") ?? "";
    const typePropRaw = searchParams.get("typeProperty"); // "Studio,Maison"
    const tagsRaw = searchParams.get("tags");         // "Piscine,Parking"

    // on clear d'abord pour repartir à zéro
    //clearFilters();

    // puis on set tous les états du contexte
    setSearchText(queryVal)
    setCity(cityVal);
    setStreet(streetVal);
    setMinPrice(minPriceVal);
    setMaxPrice(maxPriceVal);
    setMinArea(minAreaVal);
    setMaxArea(maxAreaVal);
    setMinNbrRooms(minRoomsVal);
    setMaxNbrRooms(maxRoomsVal);
    setTypeProperty(typePropRaw ? typePropRaw.split(",").map(s => s.trim()) : []);
    setTags(tagsRaw ? tagsRaw.split(",").map(s => s.trim()) : []);
  }, [searchParams.toString()]);

  // 3. Construire la string de filtres à partir des états du contexte

  /*const filtersString = useMemo(() => {
    const f: string[] = [];

    // égalité ville / rue
    if (city)   f.push(`city:"${city}"`);
    if (street) f.push(`street:"${street}"`);

    // plage prix
    if (minPrice) f.push(`price >= ${minPrice}`);
    if (maxPrice) f.push(`price <= ${maxPrice}`);

    // plage surface
    if (minArea) f.push(`area >= ${minArea}`);
    if (maxArea) f.push(`area <= ${maxArea}`);

    // plage nbr de pièces
    if (minNbrRooms) f.push(`nbrRooms >= ${minNbrRooms}`);
    if (maxNbrRooms) f.push(`nbrRooms <= ${maxNbrRooms}`);

    // OR typeProperty
    if (typeProperty.length > 0) {
      const orTypes = typeProperty
        .map(t => `typeProperty:"${t}"`)
        .join(" OR ");
      f.push(`(${orTypes})`);
    } else {
      f.push(`typeProperty:"Home"`);
    }

    // OR tags
    if (tags.length > 0) {
      const orTags = tags
        .map(t => `tags:"${t}"`)
        .join(" OR ");
      f.push(`(${orTags})`);
    }

    return f.join(" AND ");
  }, [
    city, street,
    minPrice, maxPrice,
    minArea, maxArea,
    minNbrRooms, maxNbrRooms,
    typeProperty, tags
  ]); */

  // Tout se fait ici dans le même useMemo :
  const filtersString = useMemo(() => {
    // 1. Récupération des params
    const cityVal = searchParams.get("city") ?? "";
    const streetVal = searchParams.get("street") ?? "";
    const minPriceVal = searchParams.get("minPrice") ?? "";
    const maxPriceVal = searchParams.get("maxPrice") ?? "";
    const minAreaVal = searchParams.get("minArea") ?? "";
    const maxAreaVal = searchParams.get("maxArea") ?? "";
    const minRoomsVal = searchParams.get("minNbrRooms") ?? "";
    const maxRoomsVal = searchParams.get("maxNbrRooms") ?? "";
    const typePropRaw = searchParams.get("typeProperty") ?? "";
    const tagsRaw = searchParams.get("tags") ?? "";

    // 3. Composition du tableau de clauses
    const f: string[] = [];
    if (cityVal) f.push(`city:"${cityVal}"`);
    if (streetVal) f.push(`street:"${streetVal}"`);
    if (minPriceVal) f.push(`price >= ${minPriceVal}`);
    if (maxPriceVal) f.push(`price <= ${maxPriceVal}`);
    if (minAreaVal) f.push(`area >= ${minAreaVal}`);
    if (maxAreaVal) f.push(`area <= ${maxAreaVal}`);
    if (minRoomsVal) f.push(`nbrRooms >= ${minRoomsVal}`);
    if (maxRoomsVal) f.push(`nbrRooms <= ${maxRoomsVal}`);

    if (typePropRaw) {
      f.push(
        "(" +
        typePropRaw.split(",").map(t => `typeProperty:"${t.trim()}"`).join(" OR ") +
        ")"
      );
    }

    if (tagsRaw) {
      f.push(
        "(" +
        tagsRaw.split(",").map(t => `tags:"${t.trim()}"`).join(" OR ") +
        ")"
      );
    }

    // 4. Retour de la string finale
    return f.join(" AND ");
  }, [searchParams.toString()]);

  // 4. On injecte tout ça AVANT chaque requête Algolia
  useConfigure({ filters: filtersString });

  // 3. Récupérer et déclencher la recherche texte
  const { refine: refineQuery } = useSearchBox();
  const queryVal = searchParams.get("query") ?? "";

  useEffect(() => {
    // Si pas de query dans l'URL, on passe "" => recherche globale
    refineQuery(queryVal);

  }, [queryVal]);

  // 5. hits + refinementList (pour UI si besoin)
  const { items: typePropItems, refine: refineType } =
    useRefinementList({ attribute: "typeProperty", operator: "or" });
  const { items } = useHits();

  console.log("data:", items)

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen mb-20">
      <h1 className="text-3xl font-bold text-center mb-8 text-black dark:text-white">
        Trouvez votre chez-vous
      </h1>
      <p className="mb-4 text-sm text-gray-600">
        Filters: <code>{filtersString}</code>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((propertyData, i) => (
          <PropertyCard key={i} property={propertyData} index={i} />
        ))}
      </div>
    </div>
  );
}