"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  useHits,
  useConfigure,
  useSearchBox,
  useInfiniteHits,
} from "react-instantsearch";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import PropertyCard from "../home-page/PropertyCard";
import { TypeProperty } from "@/lib/utils";
import { FilterModal } from "../home-page/FilterModal";

function FilterTag({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="flex items-center space-x-1 px-2 py-1 text-md font-medium bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200 rounded-full">
      <span>{children}</span>
      {onRemove && (
        <button onClick={onRemove} className="hover:text-red-500">
          &times;
        </button>
      )}
    </span>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const topRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    const typePropRaw = searchParams.get("typeProperty");
    const tagsRaw = searchParams.get("tags");

    setSearchText(queryVal);
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

  // 3. Construire la string de filtres
  const filtersString = useMemo(() => {
    const f: string[] = [];
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
          typePropRaw
            .split(",")
            .map((t) => `typeProperty:"${t.trim()}"`)
            .join(" OR ") +
          ")"
      );
    }
    if (tagsRaw) {
      f.push(
        "(" +
          tagsRaw
            .split(",")
            .map((t) => `tags:"${t.trim()}"`)
            .join(" OR ") +
          ")"
      );
    }
    return f.join(" AND ");
  }, [searchParams.toString()]);

  useConfigure({ filters: filtersString });

  // 4. Recherche texte
  const { refine: refineQuery } = useSearchBox();
  const queryVal = searchParams.get("query") ?? "";
  useEffect(() => {
    refineQuery(queryVal);
  }, [queryVal]);

  // 5. Infinite hits + intersection observer
  const { items, isLastPage, showMore } = useInfiniteHits();
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLastPage) {
          showMore();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [sentinelRef, isLastPage, showMore]);

  // Scroll handlers
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollToBottom = () => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={topRef}
      className="p-6 bg-white dark:bg-black min-h-screen mb-20 relative"
    >
      {/* Barre de titre + bouton Filter */}
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="flex-1 text-3xl font-bold text-center sm:text-left text-black dark:text-white">
          Trouvez votre chez-vous
        </h1>
        <FilterModal />
      </div>

      {/* Tags actives */}
      <div className="flex flex-wrap gap-2 mb-6">
        {searchText && (
          <FilterTag onRemove={() => setSearchText("")} key={`search-${searchText}`}>
            Recherche : {searchText}
          </FilterTag>
        )}
        {city && (
          <FilterTag onRemove={() => setCity("")} key={`city-${city}`}>
            Ville : {city}
          </FilterTag>
        )}
        {street && (
          <FilterTag onRemove={() => setStreet("")} key={`street-${street}`}>
            Quartier : {street}
          </FilterTag>
        )}
        {(minPrice || maxPrice) && (
          <FilterTag
            onRemove={() => {
              setMinPrice("");
              setMaxPrice("");
            }}
            key={`price-${minPrice}-${maxPrice}`}
          >
            Prix : {minPrice || "0"} – {maxPrice || "∞"}
          </FilterTag>
        )}
        {(minArea || maxArea) && (
          <FilterTag
            onRemove={() => {
              setMinArea("");
              setMaxArea("");
            }}
            key={`area-${minArea}-${maxArea}`}
          >
            Surface : {minArea || "0"} – {maxArea || "∞"} m²
          </FilterTag>
        )}
        {(minNbrRooms || maxNbrRooms) && (
          <FilterTag
            onRemove={() => {
              setMinNbrRooms("");
              setMaxNbrRooms("");
            }}
            key={`rooms-${minNbrRooms}-${maxNbrRooms}`}
          >
            Chambres : {minNbrRooms || "0"} – {maxNbrRooms || "∞"}
          </FilterTag>
        )}
        {typeProperty.map((t) => (
          <FilterTag
            onRemove={() => setTypeProperty(typeProperty.filter((x) => x !== t))}
            key={`type-${t}`}
          >
            {TypeProperty[t]}
          </FilterTag>
        ))}
        {tags.map((tg) => (
          <FilterTag
            onRemove={() => setTags(tags.filter((x) => x !== tg))}
            key={`tag-${tg}`}
          >
            {tg}
          </FilterTag>
        ))}
      </div>

      {/* Si pas de résultats, on affiche l’illustration */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Image
            src="/no-favorites.svg"
            alt="Aucun résultat trouvé"
            width={240}
            height={240}
            className="opacity-70"
          />
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-lg">
            Aucun bien ne correspond à ces critères.
          </p>
          <button
            onClick={() => {
              setSearchText("");
              setCity("");
              setStreet("");
              setMinPrice("");
              setMaxPrice("");
              setMinArea("");
              setMaxArea("");
              setMinNbrRooms("");
              setMaxNbrRooms("");
              setTypeProperty([]);
              setTags([]);
            }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded hover:brightness-110 transition"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <>
          {/* Grille de résultats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((propertyData, i) => (
              <PropertyCard key={i} property={propertyData} index={i} />
            ))}
          </div>

          {/* Sentinel pour infinite scroll */}
          <div ref={sentinelRef} />

          {/* Bouton “Voir plus” */}
          {!isLastPage && (
            <div className="text-center mt-6">
              <button
                onClick={showMore}
                className="bg-gradient-to-r from-[#146B67] via-[#1FA89B] to-[#146B67] text-white rounded-lg px-3 py-2 font-semibold hover:brightness-110 hover:shadow-md transition"
              >
                Voir plus
              </button>
            </div>
          )}
        </>
      )}

      {/* Boutons de scroll haut/bas */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <button
          onClick={scrollToTop}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          aria-label="Aller en haut"
        >
          ↑
        </button>
        <button
          onClick={scrollToBottom}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          aria-label="Aller en bas"
        >
          ↓
        </button>
      </div>
    </div>
  );
}