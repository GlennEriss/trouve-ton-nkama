import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { useEffect } from "react";
import {
  useSearchBox,
  useRefinementList,
  useRange,
  useInstantSearch,
} from "react-instantsearch";

const AlgoliaFilters = () => {
  const {
    city,
    street,
    typeProperty,
    tags,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
  } = useAlgoliaContext();

  /* const { refine: refineSearch } = useSearchBox();
  const { refine: cityRefine } = useRefinementList({ attribute: "city" });
  const { refine: streetRefine } = useRefinementList({ attribute: "street" });
  const { refine: typePropertyRefine } = useRefinementList({
    attribute: "typeProperty",
  });
  const { refine: tagsRefine } = useRefinementList({ attribute: "tags" });
  const { refine: priceRefine } = useRange({ attribute: "price" });
  const { refine: areaRefine } = useRange({ attribute: "area" });
  const { refine: roomsRefine } = useRange({ attribute: "nbrRooms" });
  const { setUiState } = useInstantSearch(); */

  /* useEffect(() => {
    // Mettre à jour l'état de l'interface utilisateur avec les filtres
    setUiState((uiState) => ({
      ...uiState,
      refinementList: {
        ...uiState.refinementList,
        city: city ? [city] : [],
        street: street ? [street] : [],
        typeProperty: typeProperty.length > 0 ? typeProperty : [],
        tags: tags.length > 0 ? tags : [],
      },
      range: {
        ...uiState.range,
        price: {
          min: minPrice ? Number(minPrice) : undefined,
          max: maxPrice ? Number(maxPrice) : undefined,
        },
        area: {
          min: minArea ? Number(minArea) : undefined,
          max: maxArea ? Number(maxArea) : undefined,
        },
        nbrRooms: {
          min: minNbrRooms ? Number(minNbrRooms) : undefined,
          max: maxNbrRooms ? Number(maxNbrRooms) : undefined,
        },
      },
    }));
  }, [
    city,
    street,
    typeProperty,
    tags,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minNbrRooms,
    maxNbrRooms,
    setUiState,
  ]); */

  return null;
};

export default AlgoliaFilters;