import { QueryClient } from '@tanstack/react-query';

// staleTime non nul par défaut : évite un refetch sur chaque focus d'écran (React Navigation
// remonte les écrans plus souvent qu'un routeur web) — mêmes valeurs par défaut que le web
// utilise déjà pour la plupart de ses requêtes React Query.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
});
