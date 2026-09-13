import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LegalWebViewScreen from '../LegalWebViewScreen';
import type { ProfileStackParamList } from '../../navigation/types';

// "Legal" est un unique écran routé par paramètre — on route ici vers LegalWebViewScreen (pas
// directement DataDeletionScreen) pour que le lien interne "Politique de Confidentialité"
// déclenche une vraie navigation React Navigation, sans mock de useNavigation.
const Stack = createNativeStackNavigator<ProfileStackParamList>();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Legal" component={LegalWebViewScreen} initialParams={{ page: 'dataDeletion' }} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('DataDeletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it('affiche le testID attendu par la navbar/e2e', async () => {
    const { getByTestId } = await renderScreen();
    expect(getByTestId('screen-legal-dataDeletion')).toBeTruthy();
  });

  it('affiche le titre, le sous-titre et la date de mise à jour réels (identiques à la PWA)', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Suppression des Données')).toBeTruthy();
    expect(
      getByText('Nous respectons votre droit à la confidentialité et à la suppression de vos données'),
    ).toBeTruthy();
    expect(getByText('Dernière mise à jour : 28 avril 2025')).toBeTruthy();
  });

  it("affiche l'avertissement d'irréversibilité réel", async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Important à savoir')).toBeTruthy();
    expect(
      getByText(
        'La suppression de vos données est irréversible. Une fois supprimées, nous ne pourrons pas restaurer vos informations.',
      ),
    ).toBeTruthy();
  });

  it('affiche la carte de contact réelle (email + objet de la demande)', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('Comment demander la suppression ?')).toBeTruthy();
    expect(getByText('Envoyez votre demande par email à :')).toBeTruthy();
    expect(getByText('glenneriss@gmail.com')).toBeTruthy();
    expect(getByText('Objet : « Suppression de compte »')).toBeTruthy();
  });

  it('le contact légal ouvre le client mail avec la vraie adresse de support', async () => {
    const { getByLabelText } = await renderScreen();
    fireEvent.press(getByLabelText('Envoyer un e-mail à glenneriss@gmail.com'));
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:glenneriss@gmail.com');
  });

  it('affiche le délai de traitement réel de 30 jours', async () => {
    const { getByText } = await renderScreen();
    expect(
      getByText(
        "Une fois votre demande reçue, nous traiterons la suppression de vos données dans un délai de 30 jours, conformément à nos conditions d'utilisation et notre politique de confidentialité.",
      ),
    ).toBeTruthy();
  });

  it('le lien "Politique de Confidentialité" est accessible et navigue réellement vers cet écran', async () => {
    const { getByLabelText, getByTestId, queryByTestId } = await renderScreen();
    const link = getByLabelText('Ouvrir la politique de confidentialité');
    expect(link.props.accessibilityRole).toBe('link');

    fireEvent.press(link);

    await waitFor(() => expect(getByTestId('screen-legal-privacy')).toBeTruthy());
    expect(queryByTestId('screen-legal-dataDeletion')).toBeNull();
  });
});
