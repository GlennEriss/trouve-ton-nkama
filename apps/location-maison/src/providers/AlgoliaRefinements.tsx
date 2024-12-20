import { useCallback } from "react";
import { useRefinementList, useRange, useInstantSearch } from "react-instantsearch";
import { useAlgoliaContext } from "./AlgoliaContext";

const AlgoliaRefinements = () => {
  const {
    city,
    street,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    typeProperty,
    tags,
  } = useAlgoliaContext();

  const { refine: cityRefine } = useRefinementList({ attribute: "city" });
  const { refine: streetRefine } = useRefinementList({ attribute: "street" });
  const { refine: typePropertyRefine } = useRefinementList({
    attribute: "typeProperty",
  });
  const { refine: tagsRefine } = useRefinementList({ attribute: "tags" });
  const { refine: priceRefine } = useRange({ attribute: "price" });
  const { refine: areaRefine } = useRange({ attribute: "area" });
  const { refine: roomsRefine } = useRange({ attribute: "nbrRooms" });

  const { setUiState } = useInstantSearch();

  const applyRefinements = useCallback(() => {
    console.log("Appliquer les filtres à Algolia");

    const selectedFilters = {
      city,
      street,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minNbrRooms,
      maxNbrRooms,
      typeProperty,
      tags,
    };

    console.log("Filtres sélectionnés :", selectedFilters);

    // Appliquer les filtres un par un
    if (city) cityRefine(city);
    if (street) streetRefine(street);
    if (typeProperty.length > 0)
      typeProperty.forEach((type) => typePropertyRefine(type));
    if (tags.length > 0) tags.forEach((tag) => tagsRefine(tag));

    // Appliquer les plages de valeurs pour le prix, la surface, et le nombre de chambres
    if (minPrice || maxPrice) {
      priceRefine([
        minPrice ? Number(minPrice) : undefined,
        maxPrice ? Number(maxPrice) : undefined,
      ]);
    }
    if (minArea || maxArea) {
      areaRefine([
        minArea ? Number(minArea) : undefined,
        maxArea ? Number(maxArea) : undefined,
      ]);
    }
    if (minNbrRooms || maxNbrRooms) {
      roomsRefine([
        minNbrRooms ? Number(minNbrRooms) : undefined,
        maxNbrRooms ? Number(maxNbrRooms) : undefined,
      ]);
    }

    // Mettre à jour l'état de l'interface utilisateur si nécessaire
    setUiState((uiState:any) => ({
      ...uiState,
      refinements: {
        ...uiState.refinements,
        city,
        street,
        price: { min: minPrice, max: maxPrice },
        area: { min: minArea, max: maxArea },
        nbrRooms: { min: minNbrRooms, max: maxNbrRooms },
        typeProperty,
        tags,
      },
    }));
  }, [
    city,
    street,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    typeProperty,
    tags,
    cityRefine,
    streetRefine,
    typePropertyRefine,
    tagsRefine,
    priceRefine,
    areaRefine,
    roomsRefine,
    setUiState,
  ]);

  // Retourne la fonction pour être déclenchée depuis un autre composant
  return { applyRefinements };
};

export default AlgoliaRefinements;