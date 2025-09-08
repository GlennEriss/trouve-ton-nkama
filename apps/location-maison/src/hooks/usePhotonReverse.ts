import { reversePhoton } from "@/lib/photonUtils";
import { PhotonResult } from "@/models/PhotonResult";
import { useQuery } from "@tanstack/react-query";

export function usePhotonReverse(lon?: number, lat?: number) {
    const enabled = typeof lon === 'number' && typeof lat === 'number';

    const { data, isFetching, error, refetch } = useQuery<PhotonResult, Error>({
        queryKey: ["photon-reverse", lon, lat],
        queryFn: async () => {
            // reversePhoton doit toujours retourner un PhotonResult (pas null) ou lever une erreur
            return await reversePhoton(lon as number, lat as number) as PhotonResult;
        },
        enabled,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
    return { result: data ?? null, isLoading: isFetching, error, refetch };
}