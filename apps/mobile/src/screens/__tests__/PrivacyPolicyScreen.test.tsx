import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegalWebViewScreen from '../LegalWebViewScreen';
import type { ProfileStackParamList } from '../../navigation/types';

// "Legal" est un unique écran routé par paramètre (page: 'terms' | 'privacy' | 'dataDeletion'),
// comme dans le vrai ProfileStack — on route ici vers LegalWebViewScreen (pas directement
// PrivacyPolicyScreen) pour que les liens internes ("suppression des données", "conditions
// d'utilisation") déclenchent une vraie navigation React Navigation, sans mock de useNavigation.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: { source: { uri: string } }) => <View testID="webview" {...props} /> };
});

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page: 'privacy' }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('PrivacyPolicyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('affiche le testID attendu par la navbar/e2e et aucune WebView', async () => {
    const { getByTestId, queryByTestId } = await renderScreen();
    expect(getByTestId('screen-legal-privacy')).toBeTruthy();
    expect(queryByTestId('webview')).toBeNull();
  });

  it('affiche le titre, le sous-titre et la date de mise à jour réels (identiques à la PWA)', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Politique de confidentialité')).toBeTruthy();
    expect(
      getByText(
        'Cette page explique quelles données sont collectées, pourquoi elles le sont, et comment elles sont protégées sur Trouve Ton Nkama.',
      ),
    ).toBeTruthy();
    expect(getByText('Dernière mise à jour : 5 mars 2026')).toBeTruthy();
  });

  it('affiche les 5 sections réelles, dans le bon ordre (identiques à PrivacyPolicyClientPage.tsx)', async () => {
    const { getByText, getAllByRole } = await renderScreen();
    const expectedOrder = [
      'Données collectées',
      'Utilisation de vos données',
      'Partage et transfert',
      'Durée de conservation',
      'Vos droits',
    ];
    expectedOrder.forEach((title) => expect(getByText(title)).toBeTruthy());

    const headings = getAllByRole('header').map((node) => node.props.children);
    const orderedSectionTitles = headings.filter((text) => expectedOrder.includes(text));
    expect(orderedSectionTitles).toEqual(expectedOrder);
  });

  it('affiche un exemple de puce réelle par section à liste', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Coordonnées : email et numéro de téléphone.')).toBeTruthy();
    expect(getByText('Création et gestion de compte.')).toBeTruthy();
    expect(
      getByText("Prestataires techniques strictement nécessaires à l'exploitation."),
    ).toBeTruthy();
    expect(getByText('Données de compte : conservées tant que le compte est actif.')).toBeTruthy();
    expect(getByText("Droit d'accès et de rectification.")).toBeTruthy();
  });

  it('le lien inline "suppression des données" est accessible et navigue réellement vers cette page', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await renderScreen();
    const link = getByLabelText('Ouvrir la page suppression des données');
    expect(link.props.accessibilityRole).toBe('link');

    fireEvent.press(link);

    // Même route ("Legal"), nouveaux params -> LegalWebViewScreen re-rend en DataDeletionScreen
    // (écran natif, plus de WebView pour aucune des 3 pages légales).
    await waitFor(() => expect(getByTestId('screen-legal-dataDeletion')).toBeTruthy());
    expect(queryByTestId('screen-legal-privacy')).toBeNull();
  });

  it('le document lié "Conditions d\'utilisation" navigue réellement vers l\'écran natif des CGU', async () => {
    const { getByLabelText, getByTestId } = await renderScreen();
    fireEvent.press(getByLabelText("Ouvrir les conditions d'utilisation"));
    await waitFor(() => expect(getByTestId('screen-legal-terms')).toBeTruthy());
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
