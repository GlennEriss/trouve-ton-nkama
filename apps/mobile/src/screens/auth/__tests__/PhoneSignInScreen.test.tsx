import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { getAuth, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import { getDoc } from '@react-native-firebase/firestore';
import PhoneSignInScreen from '../PhoneSignInScreen';

function renderScreen() {
  return render(
    <NavigationContainer>
      <PhoneSignInScreen />
    </NavigationContainer>,
  );
}

// PIÈGE RÉSOLU (voir useNotifications.test.ts) : dans @testing-library/react-native 14.x
// (React 19), `render`, `fireEvent.*` ET `renderHook` sont TOUS async — il faut les `await`
// directement, jamais les envelopper dans un `act()` manuel (ça crée un "overlapping act()
// calls" qui casse silencieusement le rendu suivant).
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedSignInWithPhoneNumber = signInWithPhoneNumber as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedSignOut = signOut as jest.Mock;

async function sendCode(phone = '074123456') {
  await fireEvent.changeText(screen.getByPlaceholderText('074123456'), phone);
  await fireEvent.press(screen.getByText('Envoyer le code'));
}

describe('PhoneSignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
  });

  it('rejette un numéro invalide sans appeler Firebase', async () => {
    await renderScreen();
    await sendCode('abc');
    expect(await screen.findByText('Numéro invalide.')).toBeTruthy();
    expect(mockedSignInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it("passe à l'étape code après un envoi réussi", async () => {
    mockedSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-1', confirm: jest.fn() });
    await renderScreen();
    await sendCode();

    expect(await screen.findByPlaceholderText('123456')).toBeTruthy();
  });

  // Régression : userDoc.exists (propriété, toujours truthy car c'est une fonction) laissait
  // n'importe quel numéro entrer sans jamais déconnecter — corrigé en userDoc.exists() (appel).
  // Ce test échoue si la régression revient.
  it("refuse la connexion et déconnecte si aucun compte n'existe pour ce numéro", async () => {
    const confirm = jest.fn().mockResolvedValue({ user: { uid: 'uid-unknown' } });
    mockedSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-1', confirm });
    mockedGetDoc.mockResolvedValue({ exists: () => false });

    await renderScreen();
    await sendCode();
    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.press(screen.getByText('Confirmer'));

    await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
    expect(await screen.findByText(/Aucun compte n'est associé à ce numéro/)).toBeTruthy();
  });

  it('laisse passer la connexion si le compte existe', async () => {
    const confirm = jest.fn().mockResolvedValue({ user: { uid: 'uid-known' } });
    mockedSignInWithPhoneNumber.mockResolvedValue({ verificationId: 'vid-1', confirm });
    mockedGetDoc.mockResolvedValue({ exists: () => true });

    await renderScreen();
    await sendCode();
    await fireEvent.changeText(await screen.findByPlaceholderText('123456'), '123456');
    await fireEvent.press(screen.getByText('Confirmer'));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith('123456'));
    expect(mockedSignOut).not.toHaveBeenCalled();
    expect(screen.queryByText(/Aucun compte/)).toBeNull();
  });
});
