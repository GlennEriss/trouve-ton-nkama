import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

// Beaucoup d'écrans utilisent useNavigation() — sans NavigationContainer autour, ça throw
// immédiatement. Wrapper partagé plutôt que dupliqué dans chaque fichier de test.
export function renderWithNavigation(ui: React.ReactElement) {
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}
