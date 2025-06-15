import { useQuery } from "@tanstack/react-query";
import { getRecommendedProperties } from "@/db/recommend.db";
import { Property } from "@/models/annonce";

interface UseRecommendProps {
    limit?: number;
    excludeId?: string;
    type?: string;
    location?: string;
}

interface UseRecommendReturn {
    properties: Property[];
    loading: boolean;
    error: unknown;
}

export function useRecommend({ 
    limit = 8, 
    excludeId, 
    type, 
    location 
}: UseRecommendProps): UseRecommendReturn {
    const { data: properties = [], isLoading: loading, error } = useQuery<Property[]>({
        queryKey: ['recommendations', { limit, excludeId, type, location }],
        queryFn: () => getRecommendedProperties({ limit, excludeId, type, location }),
        staleTime: 5 * 60 * 1000, // Les données sont considérées comme fraîches pendant 5 minutes
        cacheTime: 30 * 60 * 1000, // Les données sont gardées en cache pendant 30 minutes
        refetchOnWindowFocus: false, // Ne pas recharger automatiquement quand la fenêtre regagne le focus
        refetchOnMount: false, // Ne pas recharger automatiquement quand le composant est monté
    });

    return {
        properties,
        loading,
        error
    };
} 