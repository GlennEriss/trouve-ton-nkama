import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';

// Beaucoup d'écrans utilisent useNavigation() ET React Query — wrapper partagé pour ne pas
// dupliquer les deux providers dans chaque fichier de test. `retry: false` : sans ça, une
// requête mockée en échec relance 2 tentatives par défaut, ralentissant chaque test d'échec.
export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>{ui}</NavigationContainer>
    </QueryClientProvider>,
  );
}
