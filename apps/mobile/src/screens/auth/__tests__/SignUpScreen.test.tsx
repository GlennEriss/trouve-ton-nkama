import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { getAuth, createUserWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { getDocs, setDoc } from '@react-native-firebase/firestore';
import SignUpScreen from '../SignUpScreen';
import { renderWithNavigation } from '../../../test-utils/renderWithNavigation';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('../../../api/client', () => ({
  apiFetch: jest.fn().mockResolvedValue({}),
  API_BASE_URL: 'http://localhost:3000',
}));

const mockedGetDocs = getDocs as jest.Mock;
const mockedCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;
const mockedSignOut = signOut as jest.Mock;

// Champ par champ, reproduit SignupMobileComponent.tsx (web) — voir
// [[feedback-mobile-reuse-pwa-design]] : ne pas réduire ce formulaire à un sous-ensemble
// "pratique à tester", chaque champ ici correspond à un champ réel du web.
async function fillValidForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    firstName: 'Jean',
    lastName: 'Mba',
    email: 'jean@example.com',
    password: 'TestPassword123',
    passwordConfirm: 'TestPassword123',
    phoneNumber: '074123456',
    birthDay: '15',
    birthMonth: '6',
    birthYear: '1990',
    ...overrides,
  };
  await fireEvent.changeText(screen.getByTestId('signup-firstname'), values.firstName);
  await fireEvent.changeText(screen.getByTestId('signup-lastname'), values.lastName);
  await fireEvent.changeText(screen.getByTestId('signup-email'), values.email);
  await fireEvent.changeText(screen.getByTestId('signup-birth-day'), values.birthDay);
  await fireEvent.changeText(screen.getByTestId('signup-birth-month'), values.birthMonth);
  await fireEvent.changeText(screen.getByTestId('signup-birth-year'), values.birthYear);
  await fireEvent.changeText(screen.getByTestId('signup-phone'), values.phoneNumber);
  await fireEvent.changeText(screen.getByTestId('signup-password'), values.password);
  await fireEvent.changeText(screen.getByTestId('signup-password-confirm'), values.passwordConfirm);
  await fireEvent.press(screen.getByTestId('signup-accept-terms'));
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
    mockedGetDocs.mockResolvedValue({ empty: true });
    mockedCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } });
  });

  it('crée le compte quand tout est valide et unique (numéro normalisé en E.164, comme le web)', async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(mockedCreateUser).toHaveBeenCalledWith({}, 'jean@example.com', 'TestPassword123'));
    expect(mockedSetDoc).toHaveBeenCalled();
    const [, savedDoc] = mockedSetDoc.mock.calls[0];
    expect(savedDoc).toMatchObject({ callNumber: '+24174123456', roles: ['User'] });
  });

  it('type de compte Annonceur : ajoute le rôle Annonceur et exige la case conditions annonceur', async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fireEvent.press(screen.getByTestId('signup-account-type-announcer'));
    await fillValidForm();

    // Bouton désactivé tant que la case "conditions annonceur" (apparue avec le type de
    // compte) n'est pas cochée.
    expect(screen.getByTestId('signup-submit').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('signup-accept-announcer-terms'));
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(mockedSetDoc).toHaveBeenCalled());
    const [, savedDoc] = mockedSetDoc.mock.calls[0];
    expect(savedDoc.roles).toEqual(['User', 'Announcer']);
  });

  it("envoie un numéro WhatsApp distinct quand renseigné, sinon réutilise le numéro d'appel", async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.changeText(screen.getByTestId('signup-whatsapp'), '66123456');
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(mockedSetDoc).toHaveBeenCalled());
    const [, savedDoc] = mockedSetDoc.mock.calls[0];
    expect(savedDoc.whatsappNumber).toBe('+24166123456');
    expect(savedDoc.phoneNumbers).toEqual(['+24174123456', '+24166123456']);
  });

  it('refuse un numéro de téléphone déjà utilisé sans créer le compte', async () => {
    mockedGetDocs.mockResolvedValueOnce({ empty: false }); // requête téléphone
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByText('Ce numéro de téléphone est déjà utilisé.')).toBeTruthy();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('refuse un email déjà utilisé sans créer le compte', async () => {
    mockedGetDocs
      .mockResolvedValueOnce({ empty: true }) // téléphone libre
      .mockResolvedValueOnce({ empty: false }); // email déjà pris
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByText('Cette adresse email est déjà utilisée.')).toBeTruthy();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('bloque la soumission pour un utilisateur de moins de 18 ans', async () => {
    const now = new Date();
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm({ birthYear: String(now.getFullYear() - 17), birthMonth: String(now.getMonth() + 1), birthDay: String(now.getDate()) });

    expect(screen.getByTestId('signup-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('bloque la soumission tant que le mot de passe ne respecte pas la règle (8 car., 1 majuscule, 1 chiffre)', async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm({ password: 'weakpassword', passwordConfirm: 'weakpassword' });

    expect(screen.getByTestId('signup-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('bloque la soumission si les deux mots de passe ne correspondent pas', async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm({ passwordConfirm: 'AutreMotDePasse123' });

    expect(screen.getByTestId('signup-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('mappe auth/email-already-in-use vers un message clair même si la pré-vérification est passée', async () => {
    mockedCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByTestId('signup-submit'));

    expect(await screen.findByText('Cette adresse email est déjà utilisée.')).toBeTruthy();
  });

  it("se déconnecte (rollback) si la création du document Firestore échoue après la création du compte Auth", async () => {
    mockedSetDoc.mockRejectedValueOnce(new Error('firestore down'));
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByTestId('signup-submit'));

    await waitFor(() => expect(mockedSignOut).toHaveBeenCalled());
    expect(await screen.findByText('Une erreur est survenue. Réessayez.')).toBeTruthy();
  });
});
