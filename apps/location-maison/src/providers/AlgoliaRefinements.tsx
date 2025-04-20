import { useCallback } from "react";
import {
  useMenu,
  useRange,
  useSearchBox,
  useInstantSearch,
  useRefinementList,
} from "react-instantsearch";
import { useAlgoliaContext } from "./AlgoliaContext";

/**
 * Convertit minStr/maxStr en un tableau [min, max] (ou [undefined, undefined])
 */
function parseNumericRange(
  minStr?: string,
  maxStr?: string
): [number | undefined, number | undefined] {
  const min = minStr ? Number(minStr) : undefined;
  const max = maxStr ? Number(maxStr) : undefined;
  return [min, max];
}

/**
 * Exemple d'alternative qui utilise `refine(...)` pour
 * chaque attribut (city, street, etc.) au lieu de `setUiState`.
 */
const AlgoliaRefinements = () => {
  const {
    // Champs textuels
    city,
    street,
    searchText,
    typeProperty, // tableau ex. ["Studio", "Maison"]
    tags,         // tableau ex. ["Piscine", "Animaux admis"]

    // Champs numériques
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    // minNbrBathrooms, maxNbrBathrooms, etc.
  } = useAlgoliaContext();

  // 1) Filtres textuels
  //    - useMenu pour city/street (sélection unique)
  const { items: cityItems, refine: cityRefine } = useMenu({ attribute: "city" });
  const { items: streetItems, refine: streetRefine } = useMenu({ attribute: "street" });

  //    - useRefinementList pour typeProperty/tags (sélection multiple)
  const { items: typePropItems, refine: typePropertyRefine } = useRefinementList({
    attribute: "typeProperty",
    operator: "or", // ou "and" selon la logique voulue
  });
  const { items: tagsItems, refine: tagsRefine } = useRefinementList({
    attribute: "tags",
    operator: "or",
  });

  // 2) Filtres numériques
  const { refine: priceRefine } = useRange({ attribute: "price" });
  const { refine: areaRefine } = useRange({ attribute: "area" });
  const { refine: roomsRefine } = useRange({ attribute: "nbrRooms" });

  // 3) Recherche textuelle
  const { refine: refineQuery } = useSearchBox();

  // 4) Gestion de l'UI (facultative)
  const { setUiState } = useInstantSearch();

  /**
   * Applique tous les filtres en mode "toggle".
   * - On désélectionne d'abord toutes les valeurs actives qui ne sont plus nécessaires,
   *   puis on sélectionne les nouvelles valeurs.
   */
  const applyRefinements = useCallback(() => {
    //console.log("=== Appliquer filtres (approche refine) ===");
    //console.log("city:", city, "street:", street, "typeProperty:", typeProperty, "tags:", tags);
    //console.log("minPrice:", minPrice, "maxPrice:", maxPrice);

    // 1) Recherche textuelle
    refineQuery(searchText || "");

    // 2) Désélection des anciennes valeurs
    // city (sélection unique)
    cityItems.forEach((item) => {
      if (item.isRefined && item.value !== city) {
        cityRefine(item.value); // désactive l'ancienne valeur
      }
    });
    // street (sélection unique)
    streetItems.forEach((item) => {
      if (item.isRefined && item.value !== street) {
        streetRefine(item.value);
      }
    });
    // typeProperty (sélection multiple)
    typePropItems.forEach((item) => {
      if (item.isRefined && !typeProperty.includes(item.value)) {
        typePropertyRefine(item.value); // toggle off
      }
    });
    // tags (sélection multiple)
    tagsItems.forEach((item) => {
      if (item.isRefined && !tags.includes(item.value)) {
        tagsRefine(item.value);
      }
    });

    // 3) Sélection des nouvelles valeurs
    // city
    if (city) {
      cityRefine(city); // active la ville voulue
    }
    // street
    if (street) {
      streetRefine(street);
    }
    // typeProperty (tableau)
    typeProperty.forEach((val) => {
      typePropertyRefine(val);
    });
    // tags (tableau)
    tags.forEach((val) => {
      tagsRefine(val);
    });

    // 4) Filtres numériques
    if (minPrice || maxPrice) {
      priceRefine(parseNumericRange(minPrice, maxPrice));
    } else {
      priceRefine([undefined, undefined]);
    }

    if (minArea || maxArea) {
      areaRefine(parseNumericRange(minArea, maxArea));
    } else {
      areaRefine([undefined, undefined]);
    }

    if (minNbrRooms || maxNbrRooms) {
      roomsRefine(parseNumericRange(minNbrRooms, maxNbrRooms));
    } else {
      roomsRefine([undefined, undefined]);
    }

    /* // 5) (Facultatif) Mise à jour de l'état global
    setUiState((uiState: any) => ({
      ...uiState,
      // Ex. on pourrait mettre query = searchText
    }));
    */
  }, [
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
    cityItems,
    cityRefine,
    streetItems,
    streetRefine,
    typePropItems,
    typePropertyRefine,
    tagsItems,
    tagsRefine,
    priceRefine,
    areaRefine,
    roomsRefine,
    refineQuery,
    setUiState,
  ]);

  return { applyRefinements };
};

export default AlgoliaRefinements;
