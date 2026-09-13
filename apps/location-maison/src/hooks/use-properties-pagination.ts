import { useState, useEffect, useRef, useCallback } from 'react';
import { Property } from '@/models/annonce';
import { getProperties } from '@/db/property.db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('hooks.use-properties-pagination');

type FetchedPage = {
  properties: Property[];
  lastDoc: any;
};

export const usePropertiesPagination = ({
  limitPerPage = 10,
  type = '',
  createdBy = '',
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const fetchedPages = useRef(new Map<number, FetchedPage>());
  const pageStartCursors = useRef(new Map<number, any>([[1, null]]));
  const criteriaKey = `${limitPerPage}\u0000${type}\u0000${createdBy}`;
  const previousCriteriaKey = useRef(criteriaKey);

  const fetchData = useCallback(
    async (page: number = currentPage, reset = false) => {
      setLoading(true);

      try {
        if (reset) {
          fetchedPages.current.clear();
          pageStartCursors.current = new Map([[1, null]]);
          page = 1;
        }

        const cached = fetchedPages.current.get(page);
        if (cached) {
          setProperties(cached.properties);
          setHasNextPage(Boolean(cached.lastDoc));
          return;
        }

        const res = await getProperties({
          limitPerPage,
          lastDoc: pageStartCursors.current.get(page) ?? null,
          type,
          createdBy,
        });

        setProperties(res.properties);
        setHasNextPage(Boolean(res.lastDoc));
        fetchedPages.current.set(page, { properties: res.properties, lastDoc: res.lastDoc });
        if (res.lastDoc) {
          pageStartCursors.current.set(page + 1, res.lastDoc);
        }
        if (reset) setCurrentPage(1);
      } catch (error) {
        logger.error('Failed to fetch paginated properties', {
          page,
          reset,
          limitPerPage,
          type,
          createdBy,
          error,
        });
      } finally {
        setLoading(false);
      }
    },
    [limitPerPage, type, createdBy, currentPage]
  );

  useEffect(() => {
    if (previousCriteriaKey.current !== criteriaKey) {
      previousCriteriaKey.current = criteriaKey;
      fetchedPages.current.clear();
      pageStartCursors.current = new Map([[1, null]]);
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    void fetchData();
  }, [criteriaKey, currentPage, fetchData]);

  return {
    properties,
    loading,
    fetchData,
    nextPage: () => setCurrentPage((prev) => hasNextPage ? prev + 1 : prev),
    previousPage: () => setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev)),
    currentPage,
    hasNextPage,
    hasPreviousPage: currentPage > 1,
    // Le total exact nécessiterait une agrégation séparée. Cette borne est suffisante pour
    // afficher la navigation sans annoncer un faux total calculé sur la page courante.
    totalPages: currentPage + (hasNextPage ? 1 : 0),
  };
};
