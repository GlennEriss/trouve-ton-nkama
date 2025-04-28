"use client"
import React, { createContext, useContext, useCallback, useEffect } from "react";
import {
  useMenu,
  useRange,
  useSearchBox,
  useInstantSearch,
  useRefinementList,
  useHits,
} from "react-instantsearch";
import { useAlgoliaContext } from "./AlgoliaContext";
import { Hit } from "algoliasearch";

interface AlgoliaRefinementsProviderProps {
  children: React.ReactNode;
}

 interface AlgoliaRefinementsContextType {
  // Filtres textuels
  cityRefine: (value: string) => void;
  streetRefine: (value: string) => void;
  refineTypeProperty: (value: string) => void;
  refineTags: (value: string) => void;
  // Filtres numériques
  //areaRefine: (range: { min?: number; max?: number }) => void;
  //roomsRefine: (range: { min?: number; max?: number }) => void;
  // Recherche
  refineQuery: (query: string) => void;
  // UI state InstantSearch
  // Résultats
  datas: Hit[];
}

// Création du contexte
const AlgoliaRefinementsContext = createContext<AlgoliaRefinementsContextType | null>(null);

// Provider qui contient toute la logique de raffinement
export const AlgoliaRefinementsProvider: React.FC<AlgoliaRefinementsProviderProps> = ({ children }) => {
  const {
    city,
    street,
    searchText,
    typeProperty,
    tags,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
  } = useAlgoliaContext();

  // 1) Filtres textuels
  const { items: cityItems, refine: cityRefine } = useMenu({ attribute: "city" });
  const { items: streetItems, refine: streetRefine } = useMenu({ attribute: "street" });
  const { items: typePropItems, refine: typePropertyRefineBase } = useRefinementList({ attribute: "typeProperty", operator: "or" });
  const { items: tagsItems, refine: tagsRefineBase } = useRefinementList({ attribute: "tags", operator: "or" });

  // 2) Filtres numériques
  const { refine: areaRefine } = useRange({ attribute: "area" });
  const { refine: roomsRefine } = useRange({ attribute: "nbrRooms" });

  // 3) Recherche textuelle
  const { refine: refineQuery } = useSearchBox();

  // 4) UI InstantSearch (optional)
  const { setUiState, indexUiState, uiState } = useInstantSearch();

  // 5) Hits
  const { items } = useHits();

  // Encapsulation des raffinements dans des callbacks
  const refineTypeProperty = useCallback(
    (value: string) => typePropertyRefineBase(value),
    [typePropertyRefineBase]
  );

  const refineTags = useCallback(
    (value: string) => tagsRefineBase(value),
    [tagsRefineBase]
  );
  //console.log("items:",items)
  /* useEffect(() => {
    console.log("items:",items)
  }, [items]); */

  return (
    <AlgoliaRefinementsContext.Provider
      value={{
        // Text filters
        cityRefine,
        streetRefine,
        refineTypeProperty,
        refineTags,
        // Numeric filters
        //areaRefine,
        //roomsRefine,
        // Search
        refineQuery,
        // Results
        datas:items,
      }}
    >
      {children}
    </AlgoliaRefinementsContext.Provider>
  );
};

// Hook pour consommer le contexte
export const useAlgoliaRefinements = () => {
  const context = useContext(AlgoliaRefinementsContext);
  if (!context) {
    throw new Error(
      "useAlgoliaRefinements must be used within an AlgoliaRefinementsProvider"
    );
  }
  return context;
};

export default AlgoliaRefinementsContext;
