import { useQuery } from "@tanstack/react-query";
import { getRecommendedProperties } from "@/db/recommend.db";
import { Property } from "@/models/annonce";

interface UseRecommendProps {
    limit?: number;
    excludeId?: string;
    type?: string;
    location?: string;
    /** Annonce hors immobilier : recommander dans la même feuille de catégorie. */
    categoryId?: string;
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
    location,
    categoryId
}: UseRecommendProps): UseRecommendReturn {
    const { data: properties = [], isLoading: loading, error } = useQuery<Property[]>({
        queryKey: ['recommendations', { limit, excludeId, type, location, categoryId }],
        queryFn: () => getRecommendedProperties({ limit, excludeId, type, location, categoryId }),
        staleTime: 5 * 60 * 1000, // Les données sont considérées comme fraîches pendant 5 minutes
        gcTime: 30 * 60 * 1000, // Les données sont gardées en cache pendant 30 minutes
        refetchOnWindowFocus: false, // Ne pas recharger automatiquement quand la fenêtre regagne le focus
        refetchOnMount: false, // Ne pas recharger automatiquement quand le composant est monté
    });

    return {
        properties,
        loading,
        error
    };
} 