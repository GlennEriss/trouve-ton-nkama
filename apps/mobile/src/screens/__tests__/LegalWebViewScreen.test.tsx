import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegalWebViewScreen from '../LegalWebViewScreen';
import type { ProfileStackParamList } from '../../navigation/types';

// Les 3 pages légales sont désormais des écrans natifs (TermsOfUseScreen, PrivacyPolicyScreen,
// DataDeletionScreen) — voir leurs propres fichiers de test pour le contenu. Ce fichier ne teste
// que l'aiguillage : le bon écran natif s'affiche pour chaque valeur de `page`.
const Stack = createNativeStackNavigator<ProfileStackParamList>();

function renderPage(page: 'terms' | 'privacy' | 'dataDeletion') {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('LegalWebViewScreen', () => {
  it.each([
    ['terms', 'screen-legal-terms'],
    ['privacy', 'screen-legal-privacy'],
    ['dataDeletion', 'screen-legal-dataDeletion'],
  ] as const)('affiche l’écran natif attendu pour la page "%s"', async (page, expectedTestID) => {
    const { getByTestId } = await renderPage(page);
    expect(getByTestId(expectedTestID)).toBeTruthy();
  });
});
