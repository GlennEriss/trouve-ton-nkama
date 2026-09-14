import { useQuery, queryOptions } from '@tanstack/react-query';
import type { Property } from '@/models/annonce';

// `initialData` : quand le Server Component parent a deja recupere la propriete (ex.
// /annonce/[id]/page.tsx via getPublicPropertyById, meme forme que Property), on l'injecte ici
// pour eviter le waterfall client isLoading -> fetch -> rendu qui retardait le LCP de plusieurs
// secondes (skeleton affiche pendant tout l'aller-retour /api/property/id, alors que la donnee
// etait deja disponible cote serveur).
export function useProperty(id: string | undefined, initialData?: Property) {
  return useQuery(queryOptions({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required to fetch the property.');
      const res = await fetch(`/api/property/id?id=${id}`);
      const data = await res.json();

      if (res.status !== 200) {
        throw new Error(data.error ?? 'Failed to fetch property');
      }
      return data;
    },
    initialData,
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  }));
}