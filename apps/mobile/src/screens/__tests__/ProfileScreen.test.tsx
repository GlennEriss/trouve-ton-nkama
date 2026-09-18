import { screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import ProfileScreen from '../ProfileScreen';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { navigate: jest.fn(), isReady: jest.fn(() => true) },
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedSignOut = signOut as jest.Mock;
const mockedNavigationRefNavigate = navigationRef.navigate as jest.Mock;

const Stack = createNativeStackNavigator();
const Stub = ({ label }: { label: string }) => () => <Text>{label}</Text>;

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="ProfileHome" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={Stub({ label: 'Écran EditProfile' })} />
        <Stack.Screen name="MyListings" component={Stub({ label: 'Écran MyListings' })} />
        <Stack.Screen name="PhoneVerify" component={Stub({ label: 'Écran PhoneVerify' })} />
        <Stack.Screen name="Legal" component={Stub({ label: 'Écran Legal' })} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

async function setUserDoc(data: Record<string, unknown>) {
  await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
  const [, onNext] = mockedOnSnapshot.mock.calls[0];
  await act(async () => {
    onNext({ data: () => data });
  });
}

// Reproduit /profil (mobile, PWA) — voir ProfilInformations.tsx, ProfilDetails.tsx,
// Logout.tsx et [[feedback-mobile-reuse-pwa-design]].
describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1', email: 'jean@example.com' } });
  });

  it("affiche l'email en attendant que le document utilisateur soit chargé", async () => {
    await renderScreen();
    expect(await screen.findByText('jean@example.com')).toBeTruthy();
  });

  it('affiche le nom complet une fois le document utilisateur chargé (repli prénom+nom, sans pseudo)', async () => {
    await renderScreen();
    await setUserDoc({ firstname: 'Jean', lastname: 'Mba' });

    expect(await screen.findByText('Jean Mba')).toBeTruthy();
  });

  it('affiche le pseudo en priorité sur prénom+nom (comme getUserDisplayName, web)', async () => {
    await renderScreen();
    await setUserDoc({ firstname: 'Jean', lastname: 'Mba', pseudo: 'Ma Boutique' });

    expect(await screen.findByText('Ma Boutique')).toBeTruthy();
    expect(screen.queryByText('Jean Mba')).toBeNull();
  });

  it("affiche toujours \"Vérifier mon numéro de téléphone\" (le web n'affiche pas de coche même vérifié)", async () => {
    await renderScreen();
    expect(await screen.findByText('Vérifier mon numéro de téléphone')).toBeTruthy();

    await setUserDoc({ phoneNumberVerified: true });

    expect(await screen.findByText('Vérifier mon numéro de téléphone')).toBeTruthy();
  });

  it('affiche "Devenir annonceur" pour un compte User, le masque pour un compte Announcer', async () => {
    await renderScreen();
    expect(await screen.findByText('Devenir annonceur')).toBeTruthy();

    await setUserDoc({ roles: ['User', 'Announcer'] });

    await waitFor(() => expect(screen.queryByText('Devenir annonceur')).toBeNull());
  });

  it('affiche tous les items du menu réel (web) dans le bon ordre, plus "Mes annonces" (mobile, préexistant), sans "Faire de la pub" ni "Mon solde" (masqués sur mobile)', async () => {
    await renderScreen();
    const expectedOrder = [
      'Devenir annonceur',
      'Mes annonces',
      'Favoris',
      'Vérifier mon numéro de téléphone',
      'Paramètre',
      'Connexion et sécurité',
      'Politique de confidentialité',
      "Condition d'utilisations",
    ];
    for (const label of expectedOrder) {
      expect(await screen.findByText(label)).toBeTruthy();
    }
    expect(screen.queryByText('Faire de la pub')).toBeNull();
    expect(screen.queryByText('Mon solde')).toBeNull();
  });

  it('navigue vers Mes annonces au tap', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText('Mes annonces'));
    expect(await screen.findByText('Écran MyListings')).toBeTruthy();
  });

  it('navigue vers la modification du profil au tap sur la carte d\'identité', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByTestId('profile-identity-card'));
    expect(await screen.findByText('Écran EditProfile')).toBeTruthy();
  });

  it('Favoris navigue via navigationRef (écran de premier niveau du Drawer, hors de ce stack)', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText('Favoris'));
    expect(mockedNavigationRefNavigate).toHaveBeenCalledWith('Main', { screen: 'Favoris' });
  });

  it('les items sans écran construit affichent "Bientôt disponible" au tap', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    await renderScreen();
    await fireEvent.press(await screen.findByText('Paramètre'));
    expect(alertSpy).toHaveBeenCalledWith('Bientôt disponible', 'Paramètre arrive prochainement.');
    alertSpy.mockRestore();
  });

  it('déconnecte au tap sur "Se déconnecter"', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText('Se déconnecter'));
    expect(mockedSignOut).toHaveBeenCalled();
  });
});
