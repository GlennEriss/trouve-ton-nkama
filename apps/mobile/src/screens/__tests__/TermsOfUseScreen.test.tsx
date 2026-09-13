import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegalWebViewScreen from '../LegalWebViewScreen';
import type { ProfileStackParamList } from '../../navigation/types';

// "Legal" est un unique écran routé par paramètre (page: 'terms' | 'privacy' | 'dataDeletion'),
// comme dans le vrai ProfileStack — on route ici vers LegalWebViewScreen (pas directement
// TermsOfUseScreen) pour que le lien interne "politique de confidentialité" déclenche une vraie
// navigation React Navigation vers le même écran avec d'autres params, sans mock de useNavigation.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: { source: { uri: string } }) => <View testID="webview" {...props} /> };
});

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page: 'terms' }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('TermsOfUseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('affiche le testID attendu par la navbar/e2e et aucune WebView', async () => {
    const { getByTestId, queryByTestId } = await renderScreen();
    expect(getByTestId('screen-legal-terms')).toBeTruthy();
    expect(queryByTestId('webview')).toBeNull();
  });

  it('affiche le titre, le sous-titre et la date de mise à jour réels (identiques à la PWA)', async () => {
    const { getByText } = await renderScreen();
    expect(getByText("Conditions d'utilisation")).toBeTruthy();
    expect(
      getByText(
        "Ces règles définissent vos droits et obligations lors de l'utilisation de Trouve Ton Nkama.",
      ),
    ).toBeTruthy();
    expect(getByText('Dernière mise à jour : 5 mars 2026')).toBeTruthy();
  });

  it('affiche les 6 sections réelles, dans le bon ordre (identiques à TermsOfUseClientPage.tsx)', async () => {
    const { getByText, getAllByRole } = await renderScreen();
    const expectedOrder = [
      'Objet',
      'Éligibilité du compte',
      'Utilisation de la plateforme',
      'Responsabilités',
      'Données personnelles',
      'Modifications et version',
    ];
    expectedOrder.forEach((title) => expect(getByText(title)).toBeTruthy());

    const headings = getAllByRole('header').map((node) => node.props.children);
    const orderedSectionTitles = headings.filter((text) => expectedOrder.includes(text));
    expect(orderedSectionTitles).toEqual(expectedOrder);
  });

  it('affiche un exemple de puce réelle par section à liste', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Vous devez protéger vos identifiants et votre mot de passe.')).toBeTruthy();
    expect(
      getByText("Pas d'usurpation d'identité ni de publication sans autorisation."),
    ).toBeTruthy();
    expect(getByText('Les annonces doivent refléter fidèlement le bien proposé.')).toBeTruthy();
  });

  it('le lien inline "politique de confidentialité" est accessible et navigue réellement vers la page privacy', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await renderScreen();
    const link = getByLabelText('Ouvrir la politique de confidentialité');
    expect(link.props.accessibilityRole).toBe('link');

    fireEvent.press(link);

    // Même route ("Legal"), nouveaux params -> LegalWebViewScreen re-rend en PrivacyPolicyScreen
    // (écran natif, pas de WebView). La transition native-stack est asynchrone -> waitFor.
    await waitFor(() => expect(getByTestId('screen-legal-privacy')).toBeTruthy());
    expect(queryByTestId('screen-legal-terms')).toBeNull();
  });

  it('le document lié "Politique de confidentialité" (bloc "Documents liés") navigue aussi réellement', async () => {
    const { getByLabelText, getByTestId } = await renderScreen();
    fireEvent.press(getByLabelText('Ouvrir la politique de confidentialité (documents liés)'));
    await waitFor(() => expect(getByTestId('screen-legal-privacy')).toBeTruthy());
  });

  it('le document lié "Conditions annonceur" ouvre l’URL web réelle (pas d’écran natif équivalent)', async () => {
    const { getByLabelText } = await renderScreen();
    fireEvent.press(getByLabelText('Ouvrir les conditions annonceur (site web)'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.tonnkama.com/announcer-terms');
  });

  it('le contact légal ouvre le client mail avec la vraie adresse de support', async () => {
    const { getByLabelText } = await renderScreen();
    fireEvent.press(getByLabelText('Envoyer un e-mail à glenneriss@gmail.com'));
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:glenneriss@gmail.com');
  });

  it('affiche la mention de pied de page réelle', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Ces informations sont publiées par Trouve Ton Nkama.')).toBeTruthy();
  });
});
