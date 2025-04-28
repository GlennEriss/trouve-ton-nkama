"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { InstantSearch } from "react-instantsearch";
import { liteClient as algoliasearch } from "algoliasearch/lite";

// Configuration du client Algolia
const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
);

// Typage du contexte Algolia
interface AlgoliaContextType {
  indexName: string;

  // Champs textuels / numériques
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
  const [tags, setTags] = useState<string[]>([]);

  // Résultats filtrés (optionnel)
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  // Recherche textuelle globale
  const [searchText, setSearchText] = useState("");

  // Fonction pour tout remettre à zéro
  const clearFilters = () => {
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
    setTags([]);
    //setSearchText("");
  };

  return (
    <AlgoliaContext.Provider
      value={{
        indexName,
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
        tags,
        setTags,
        filteredResults,
        setFilteredResults,
        searchText,
        setSearchText,
        clearFilters,
      }}
    >
      <InstantSearch searchClient={searchClient} indexName={indexName}>
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
