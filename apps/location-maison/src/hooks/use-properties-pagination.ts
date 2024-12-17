import { useState, useEffect, useMemo } from "react";
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
  
  useEffect(() => {
    setLoading(true);

    // Si les données existent déjà, on n'appelle pas Firestore
    if (fetchedPages[currentPage]) {
      setProperties(fetchedPages[currentPage].properties);
      setLoading(false);
      return;
    }

    getProperties({
      limitPerPage,
      lastDoc: lastDocs[currentPage - 1],
      type,
      createdBy,
    }).then((res) => {
      setProperties(res.properties);

      fetchedPages[currentPage] = { properties: res.properties, lastDoc: res.lastDoc };
      setLastDocs((prev) => [...prev, res.lastDoc]);

      setLoading(false);
    });
  }, [currentPage, type, createdBy, fetchedPages]);

  return {
    properties,
    loading,
    nextPage: () => setCurrentPage((prev) => prev + 1),
    previousPage: () => setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev)),
    currentPage,
    totalPages: Math.ceil(properties.length / limitPerPage),
  };
};