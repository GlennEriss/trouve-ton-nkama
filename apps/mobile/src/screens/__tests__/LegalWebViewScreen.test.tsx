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

describe('LegalWebViewScreen', () => {
  // "terms" est un écran natif dédié (TermsOfUseScreen), pas un WebView — voir son propre
  // fichier de test. Seules privacy/dataDeletion passent encore par le WebView.
  it.each([
    ['privacy', 'https://www.tonnkama.com/privacy-policy'],
    ['dataDeletion', 'https://www.tonnkama.com/data-deletion'],
  ] as const)('charge la bonne URL pour la page "%s"', async (page, expectedUrl) => {
    const { getByTestId } = await render(<LegalWebViewScreen {...routeWith(page)} />);
    expect(getByTestId('webview').props.source.uri).toBe(expectedUrl);
  });

  it('affiche l’écran natif des CGU (pas de WebView) pour la page "terms"', async () => {
    const { getByTestId, queryByTestId } = await render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page: 'terms' }} />
        </Stack.Navigator>
      </NavigationContainer>,
    );
    expect(getByTestId('screen-legal-terms')).toBeTruthy();
    expect(queryByTestId('webview')).toBeNull();
  });
});
