import { screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import ProfileScreen from '../ProfileScreen';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedSignOut = signOut as jest.Mock;

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

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1', email: 'jean@example.com' } });
  });

  it("affiche l'email tant que le nom n'est pas encore chargé", async () => {
    await renderScreen();
    expect(await screen.findByText('jean@example.com')).toBeTruthy();
  });

  it('affiche le nom complet une fois le document utilisateur chargé', async () => {
    await renderScreen();
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];
    await act(async () => {
      onNext({ data: () => ({ firstname: 'Jean', lastname: 'Mba' }) });
    });

    expect(await screen.findByText('Jean Mba')).toBeTruthy();
  });

  it('affiche "Vérifier mon numéro" si non vérifié, "Numéro vérifié ✓" sinon', async () => {
    await renderScreen();
    expect(await screen.findByText('Vérifier mon numéro')).toBeTruthy();

    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];
    await act(async () => {
      onNext({ data: () => ({ phoneNumberVerified: true }) });
    });

    expect(await screen.findByText('Numéro vérifié ✓')).toBeTruthy();
  });

  it('navigue vers chaque écran au tap sur la ligne correspondante', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText('Mes annonces'));
    expect(await screen.findByText('Écran MyListings')).toBeTruthy();
  });

  it('déconnecte au tap sur "Se déconnecter"', async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText('Se déconnecter'));
    expect(mockedSignOut).toHaveBeenCalled();
  });
});
