import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";

const PRICE_MAX = 1_000_000_000;

export const useFilterModal = () => {
  const router = useRouter();
  const {
    searchText,
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
    clearFilters,
  } = useAlgoliaContext();

  const [open, setOpen] = useState(false);
  const [localCity, setLocalCity] = useState(city);
  const [localStreet, setLocalStreet] = useState(street);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const [localMinArea, setLocalMinArea] = useState(minArea);
  const [localMaxArea, setLocalMaxArea] = useState(maxArea);
  const [localMinRooms, setLocalMinRooms] = useState(minNbrRooms);
  const [localMaxRooms, setLocalMaxRooms] = useState(maxNbrRooms);
  const [localTypes, setLocalTypes] = useState<string[]>(typeProperty);
  const [localTags, setLocalTags] = useState<string[]>(tags);

  useEffect(() => {
    if (open) {
      setLocalCity(city);
      setLocalStreet(street);
      setLocalMinPrice(minPrice);
      setLocalMaxPrice(maxPrice);
      setLocalMinArea(minArea);
      setLocalMaxArea(maxArea);
      setLocalMinRooms(minNbrRooms);
      setLocalMaxRooms(maxNbrRooms);
      setLocalTypes(typeProperty);
      setLocalTags(tags);
    }
  }, [open]);

  const clearLocalFilters = () => {
    setLocalCity("");
    setLocalStreet("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    setLocalMinArea("");
    setLocalMaxArea("");
    setLocalMinRooms("");
    setLocalMaxRooms("");
    setLocalTypes([]);
    setLocalTags([]);
  };

  // Fonction pour normaliser et valider les valeurs numériques
  const normalizeNumericValues = () => {
    let minP = Math.max(0, Number(localMinPrice) || 0);
    let maxP = Math.max(0, Number(localMaxPrice) || 0);
    
    if (minP >= maxP) {
      maxP = PRICE_MAX;
      setLocalMaxPrice(String(PRICE_MAX));
    }
    
    const minA = Math.max(0, Number(localMinArea) || 0);
    const maxA = Math.max(0, Number(localMaxArea) || 0);
    const minR = Math.max(0, Number(localMinRooms) || 0);
    const maxR = Math.max(0, Number(localMaxRooms) || 0);
    
    return { minP, maxP, minA, maxA, minR, maxR };
  };

  // Fonction pour mettre à jour les états globaux
  const updateGlobalStates = (values: ReturnType<typeof normalizeNumericValues>) => {
    const { minP, maxP, minA, maxA, minR, maxR } = values;
    
    // Mises à jour des états string
    const stringUpdates = [
      { condition: localCity, setter: setCity, value: localCity },
      { condition: localStreet, setter: setStreet, value: localStreet },
      { condition: localMinPrice, setter: setMinPrice, value: String(minP) },
      { condition: localMaxPrice, setter: setMaxPrice, value: String(maxP) },
      { condition: localMinArea, setter: setMinArea, value: String(minA) },
      { condition: localMaxArea, setter: setMaxArea, value: String(maxA) },
      { condition: localMinRooms, setter: setMinNbrRooms, value: String(minR) },
      { condition: localMaxRooms, setter: setMaxNbrRooms, value: String(maxR) },
    ];

    // Mises à jour des états array
    const arrayUpdates = [
      { condition: localTypes.length, setter: setTypeProperty, value: localTypes },
      { condition: localTags.length, setter: setTags, value: localTags },
    ];

    stringUpdates.forEach(({ condition, setter, value }) => {
      if (condition) setter(value as string);
    });

    arrayUpdates.forEach(({ condition, setter, value }) => {
      if (condition) setter(value as string[]);
    });
  };

  // Fonction pour construire les paramètres URL
  const buildUrlParams = (values: ReturnType<typeof normalizeNumericValues>) => {
    const { minP, maxP } = values;
    const params = new URLSearchParams();
    
    const paramMappings = [
      { condition: searchText, key: "query", value: searchText },
      { condition: localCity, key: "city", value: localCity },
      { condition: localStreet, key: "street", value: localStreet },
      { condition: localMinPrice, key: "minPrice", value: String(minP) },
      { condition: localMaxPrice, key: "maxPrice", value: String(maxP) },
      { condition: localMinArea, key: "minArea", value: localMinArea },
      { condition: localMaxArea, key: "maxArea", value: localMaxArea },
      { condition: localMinRooms, key: "minNbrRooms", value: localMinRooms },
      { condition: localMaxRooms, key: "maxNbrRooms", value: localMaxRooms },
      { condition: localTypes.length, key: "typeProperty", value: localTypes.join(",") },
      { condition: localTags.length, key: "tags", value: localTags.join(",") },
    ];

    paramMappings.forEach(({ condition, key, value }) => {
      if (condition) params.append(key, value);
    });
    
    return params;
  };

  const onApply = () => {
    const normalizedValues = normalizeNumericValues();
    updateGlobalStates(normalizedValues);
    
    const params = buildUrlParams(normalizedValues);
    router.push(`/search?${params.toString()}`);
    
    setOpen(false);
  };

  const toggleLocal = (list: string[], item: string, setter: (v: string[]) => void) =>
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);

  return {
    // États
    open, setOpen,
    localCity, setLocalCity,
    localStreet, setLocalStreet,
    localMinPrice, setLocalMinPrice,
    localMaxPrice, setLocalMaxPrice,
    localMinArea, setLocalMinArea,
    localMaxArea, setLocalMaxArea,
    localMinRooms, setLocalMinRooms,
    localMaxRooms, setLocalMaxRooms,
    localTypes, setLocalTypes,
    localTags, setLocalTags,
    
    // Actions
    clearLocalFilters,
    onApply,
    toggleLocal,
    clearFilters,
  };
}; 