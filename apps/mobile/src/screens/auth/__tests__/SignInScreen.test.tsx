import { Platform } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import SignInScreen from '../SignInScreen';
import { renderWithNavigation } from '../../../test-utils/renderWithNavigation';

jest.mock('@react-native-firebase/auth');

const mockedSignIn = signInWithEmailAndPassword as jest.Mock;

// Placeholders/libellés repris tels quels de SigninMobileComponent.tsx (web) — voir
// [[feedback-mobile-reuse-pwa-design]].
async function fillAndSubmit(email: string, password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Saisissez votre email'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Saisissez votre mot de passe'), password);
  await fireEvent.press(screen.getByText('Connexion'));
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
  });

  it('appelle signInWithEmailAndPassword avec les champs saisis (email trim)', async () => {
    mockedSignIn.mockResolvedValue({});
    await renderWithNavigation(<SignInScreen />);
    await fillAndSubmit('  test@example.com  ', 'secret123');

    await waitFor(() => expect(mockedSignIn).toHaveBeenCalledWith({}, 'test@example.com', 'secret123'));
  });

  it.each([
    ['auth/wrong-password', 'Email ou mot de passe incorrect.'],
    ['auth/invalid-credential', 'Email ou mot de passe incorrect.'],
    ['auth/user-not-found', 'Aucun compte ne correspond à cet email.'],
    ['auth/too-many-requests', 'Trop de tentatives. Réessayez dans quelques minutes.'],
    ['auth/network-request-failed', 'Impossible de se connecter. Vérifiez vos identifiants.'],
  ])('mappe %s vers un message clair', async (code, expectedMessage) => {
    mockedSignIn.mockRejectedValue({ code });
    await renderWithNavigation(<SignInScreen />);
    await fillAndSubmit('test@example.com', 'wrong');

    expect(await screen.findByText(expectedMessage)).toBeTruthy();
  });

  it('désactive le bouton tant que email ou mot de passe est vide', async () => {
    // Connexion (Text) -> LinearGradient -> TouchableOpacity (GradientButton, voir
    // components/GradientButton.tsx) : accessibilityState vit sur le TouchableOpacity, un
    // niveau plus haut que pour un bouton simple.
    await renderWithNavigation(<SignInScreen />);
    const button = screen.getByText('Connexion').parent?.parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(screen.getByPlaceholderText('Saisissez votre email'), 'test@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Saisissez votre mot de passe'), 'secret123');
    expect(screen.getByText('Connexion').parent?.parent?.props.accessibilityState?.disabled).toBe(false);
  });

  it('affiche le vrai logo Google (plus le placeholder "G")', async () => {
    await renderWithNavigation(<SignInScreen />);
    expect(screen.getByText('Continuer avec Google')).toBeTruthy();
    expect(screen.queryByText('G')).toBeNull();
  });

  it('propose "Continuer avec Apple" sur iOS', async () => {
    Platform.OS = 'ios';
    await renderWithNavigation(<SignInScreen />);
    expect(screen.getByText('Continuer avec Apple')).toBeTruthy();
  });

  it("masque le bouton Apple hors iOS", async () => {
    Platform.OS = 'android';
    await renderWithNavigation(<SignInScreen />);
    expect(screen.queryByText('Continuer avec Apple')).toBeNull();
    Platform.OS = 'ios';
  });
});
