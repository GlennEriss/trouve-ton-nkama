"use client"
import React, { createContext, useContext, useCallback, useMemo } from "react";
import {
  useMenu,
  useSearchBox,
  useRefinementList,
  useHits,
} from "react-instantsearch";
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

  // 1) Filtres textuels
  const { refine: cityRefine } = useMenu({ attribute: "city" });
  const { refine: streetRefine } = useMenu({ attribute: "street" });
  const { refine: typePropertyRefineBase } = useRefinementList({ attribute: "typeProperty", operator: "or" });
  const { refine: tagsRefineBase } = useRefinementList({ attribute: "tags", operator: "or" });


  // 3) Recherche textuelle
  const { refine: refineQuery } = useSearchBox();

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

  const contextValue = useMemo(() => ({
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
    datas: items,
  }), [
    cityRefine,
    streetRefine,
    refineTypeProperty,
    refineTags,
    refineQuery,
    items
  ]);

  return (
    <AlgoliaRefinementsContext.Provider value={contextValue}>
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
