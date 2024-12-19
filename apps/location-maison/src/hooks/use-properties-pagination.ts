import { useState, useEffect, useMemo, useCallback } from "react";
import { Property } from "@/models/annonce";
import { getProperties } from "@/db/property.db";

type FetchedPage = {
  properties: Property[];
  lastDoc: any;
};

export const usePropertiesPagination = ({
  limitPerPage = 10,
  type = "",
  createdBy = "",
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocs, setLastDocs] = useState<any[]>([null]); // Référence du dernier document

  const fetchedPages = useMemo<Record<number, FetchedPage>>(() => ({}), []);

  // Fonction stable pour fetcher les données
  const fetchData = useCallback(
    async (page: number = currentPage, reset = false) => {
      setLoading(true);

      try {
        if (!reset && fetchedPages[page]) {
          setProperties(fetchedPages[page].properties);
          setLoading(false);
          return;
        }

        const res = await getProperties({
          limitPerPage,
          lastDoc: reset ? null : lastDocs[page - 1],
          type,
          createdBy,
        });

        setProperties(res.properties);

        if (reset) {
          setLastDocs([null]);
          fetchedPages[1] = { properties: res.properties, lastDoc: res.lastDoc };
          setCurrentPage(1);
        } else {
          fetchedPages[page] = { properties: res.properties, lastDoc: res.lastDoc };
          setLastDocs((prev) => [...prev, res.lastDoc]);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
      } finally {
        setLoading(false);
      }
    },
    [limitPerPage, type, createdBy, lastDocs, fetchedPages, currentPage] // Dépendances minimales
  );

  // Charger les données à l'initialisation ou au changement de page
  useEffect(() => {
    fetchData();
  }, [currentPage, fetchData]);

  return {
    properties,
    loading,
    fetchData,
    nextPage: () => setCurrentPage((prev) => prev + 1),
    previousPage: () => setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev)),
    currentPage,
    totalPages: Math.ceil(properties.length / limitPerPage),
  };
};