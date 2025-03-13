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
  typeProperty: string[];
  setTypeProperty: React.Dispatch<React.SetStateAction<string[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  clearFilters: () => void; // Réinitialise tous les filtres
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredResults: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilteredResults: (filteredResults: any) => void;
}

// Création du contexte Algolia
const AlgoliaContext = createContext<AlgoliaContextType | null>(null);

interface AlgoliaProviderProps {
  children: React.ReactNode;
  indexName: string;
}

export const AlgoliaProvider: React.FC<AlgoliaProviderProps> = ({
  children,
  indexName,
}: AlgoliaProviderProps) => {
  const [city, setCity] = useState<string>("");
  const [street, setStreet] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minArea, setMinArea] = useState<string>("");
  const [maxArea, setMaxArea] = useState<string>("");
  const [minNbrRooms, setMinNbrRooms] = useState<string>("");
  const [maxNbrRooms, setMaxNbrRooms] = useState<string>("");
  const [typeProperty, setTypeProperty] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filteredResults, setFilteredResults] = useState<any[]>([]);

  const clearFilters = () => {
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
  };

  return (
    <AlgoliaContext.Provider
      value={{
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
        clearFilters,
        filteredResults,
        setFilteredResults,
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
