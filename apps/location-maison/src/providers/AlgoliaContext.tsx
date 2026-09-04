"use client";

import { createContext, useCallback, useContext, useState, useMemo } from "react";
import { InstantSearch } from "react-instantsearch";
import { algoliaClient as searchClient } from "@/lib/algolia";

// Client Algolia partagé, "cache-aware" (proxy /api/algolia/search, voir
// src/lib/algolia.ts et docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md) —
// un seul point de cache pour tout le trafic Algolia côté client, InstantSearch inclus.

// Typage du contexte Algolia
export interface AlgoliaContextType {
  indexName: string;

  // Champs textuels / numériques
  province: string;
  setProvince: React.Dispatch<React.SetStateAction<string>>;

  city: string;
  setCity: React.Dispatch<React.SetStateAction<string>>;

  street: string;
  setStreet: React.Dispatch<React.SetStateAction<string>>;

  minPrice: string;
  setMinPrice: React.Dispatch<React.SetStateAction<string>>;
  maxPrice: string;
  setMaxPrice: React.Dispatch<React.SetStateAction<string>>;

  minArea: string;
  setMinArea: React.Dispatch<React.SetStateAction<string>>;
  maxArea: string;
  setMaxArea: React.Dispatch<React.SetStateAction<string>>;

  minNbrRooms: string;
  setMinNbrRooms: React.Dispatch<React.SetStateAction<string>>;
  maxNbrRooms: string;
  setMaxNbrRooms: React.Dispatch<React.SetStateAction<string>>;

  minNbrBathrooms: string;
  setMinNbrBathrooms: React.Dispatch<React.SetStateAction<string>>;
  maxNbrBathrooms: string;
  setMaxNbrBathrooms: React.Dispatch<React.SetStateAction<string>>;

  minNbrChickens: string;
  setMinNbrChickens: React.Dispatch<React.SetStateAction<string>>;
  maxNbrChickens: string;
  setMaxNbrChickens: React.Dispatch<React.SetStateAction<string>>;

  typeProperty: string[];
  setTypeProperty: React.Dispatch<React.SetStateAction<string[]>>;

  status: string[];
  setStatus: React.Dispatch<React.SetStateAction<string[]>>;

  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;

  // Nettoyage total des filtres
  clearFilters: () => void;

  // Résultats filtrés (si vous en avez besoin)
  filteredResults: any[];
  setFilteredResults: (filteredResults: any[]) => void;

  // Recherche textuelle globale
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
}

const AlgoliaContext = createContext<AlgoliaContextType | null>(null);

interface AlgoliaProviderProps {
  children: React.ReactNode;
  indexName: string;
}

export const AlgoliaProvider: React.FC<AlgoliaProviderProps> = ({
  children,
  indexName,
}) => {
  // Champs textuels / numériques
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minNbrRooms, setMinNbrRooms] = useState("");
  const [maxNbrRooms, setMaxNbrRooms] = useState("");
  const [minNbrBathrooms, setMinNbrBathrooms] = useState("");
  const [maxNbrBathrooms, setMaxNbrBathrooms] = useState("");
  const [minNbrChickens, setMinNbrChickens] = useState("");
  const [maxNbrChickens, setMaxNbrChickens] = useState("");

  // Sélections multiples
  const [typeProperty, setTypeProperty] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Résultats filtrés (optionnel)
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  // Recherche textuelle globale
  const [searchText, setSearchText] = useState("");

  // Fonction pour tout remettre à zéro
  const clearFilters = useCallback(() => {
    setProvince("");
    setCity("");
    setStreet("");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    setMinNbrRooms("");
    setMaxNbrRooms("");
    setMinNbrBathrooms("");
    setMaxNbrBathrooms("");
    setMinNbrChickens("");
    setMaxNbrChickens("");
    setTypeProperty([]);
    setStatus([]);
    setTags([]);
    setFilteredResults([]);
    setSearchText("");
  }, []);

  const contextValue = useMemo(() => ({
    indexName,
    province,
    setProvince,
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
    minNbrBathrooms,
    setMinNbrBathrooms,
    maxNbrBathrooms,
    setMaxNbrBathrooms,
    minNbrChickens,
    setMinNbrChickens,
    maxNbrChickens,
    setMaxNbrChickens,
    typeProperty,
    setTypeProperty,
    status,
    setStatus,
    tags,
    setTags,
    filteredResults,
    setFilteredResults,
    searchText,
    setSearchText,
    clearFilters,
  }), [
    indexName,
    province,
    city,
    street,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    minNbrBathrooms,
    maxNbrBathrooms,
    minNbrChickens,
    maxNbrChickens,
    typeProperty,
    status,
    tags,
    filteredResults,
    searchText,
    clearFilters
  ]);

  return (
    <AlgoliaContext.Provider value={contextValue}>
      <InstantSearch
        searchClient={searchClient}
        indexName={indexName}
      >
        {children}
      </InstantSearch>
    </AlgoliaContext.Provider>
  );
};

export const useAlgoliaContext = (): AlgoliaContextType => {
  const context = useContext(AlgoliaContext);
  if (!context) {
    throw new Error("useAlgoliaContext must be used within an AlgoliaProvider");
  }
  return context;
};
