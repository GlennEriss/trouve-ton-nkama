import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegalWebViewScreen from '../LegalWebViewScreen';
import type { ProfileStackParamList } from '../../navigation/types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: { source: { uri: string } }) => <View testID="webview" {...props} /> };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function routeWith(page: 'terms' | 'privacy' | 'dataDeletion'): any {
  return { route: { params: { page } } };
}

function renderNative(page: 'terms' | 'privacy') {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('LegalWebViewScreen', () => {
  // "terms" et "privacy" sont des écrans natifs dédiés (TermsOfUseScreen, PrivacyPolicyScreen),
  // pas des WebView — voir leurs propres fichiers de test. Seule "dataDeletion" passe encore
  // par le WebView.
  it('charge la bonne URL pour la page "dataDeletion"', async () => {
    const { getByTestId } = await render(<LegalWebViewScreen {...routeWith('dataDeletion')} />);
    expect(getByTestId('webview').props.source.uri).toBe('https://www.tonnkama.com/data-deletion');
  });

  it('affiche l’écran natif des CGU (pas de WebView) pour la page "terms"', async () => {
    const { getByTestId, queryByTestId } = await renderNative('terms');
    expect(getByTestId('screen-legal-terms')).toBeTruthy();
    expect(queryByTestId('webview')).toBeNull();
  });

  it('affiche l’écran natif de la politique de confidentialité (pas de WebView) pour la page "privacy"', async () => {
    const { getByTestId, queryByTestId } = await renderNative('privacy');
    expect(getByTestId('screen-legal-privacy')).toBeTruthy();
    expect(queryByTestId('webview')).toBeNull();
  });
});
