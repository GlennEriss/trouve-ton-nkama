import { useMemo } from "react";
import { useDebounce } from "./useDebounce";
import { PhotonResult } from "@/models/PhotonResult";
import { searchPhoton } from "@/lib/photonUtils";
import { useQuery } from "@tanstack/react-query";

export function usePhotonSearch(query: string, delay = 500) {
    const debouncedQuery = useDebounce(query, delay);

    const enabled = !!debouncedQuery && debouncedQuery.length > 0;

    const {
        data,
        isFetching,
        error,
    } = useQuery<PhotonResult[], Error>({
        queryKey: ["photon", debouncedQuery],
        queryFn: async () => {
            // searchPhoton devrait gérer le fetch et peut accepter un signal si nécessaire
            return await searchPhoton(debouncedQuery as string);
        },
        enabled,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });

    // Normaliser le retour sans useEffect/useState
    const results = useMemo(() => (enabled && data ? data : []), [enabled, data]);
    const errorMessage = error ? (error.message || "Erreur lors de la recherche") : null;

    return { results, isLoading: isFetching, error: errorMessage };
}