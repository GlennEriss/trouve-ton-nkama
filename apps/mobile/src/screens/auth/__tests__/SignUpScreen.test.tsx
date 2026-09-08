import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getDocs, setDoc } from '@react-native-firebase/firestore';
import SignUpScreen from '../SignUpScreen';
import { renderWithNavigation } from '../../../test-utils/renderWithNavigation';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetDocs = getDocs as jest.Mock;
const mockedCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockedSetDoc = setDoc as jest.Mock;

const VALID_BIRTH_DATE = '1990-06-15';

async function fillValidForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    firstName: 'Jean',
    lastName: 'Mba',
    email: 'jean@example.com',
    password: 'secret123',
    phoneNumber: '074123456',
    birthDate: VALID_BIRTH_DATE,
    ...overrides,
  };
  await fireEvent.changeText(screen.getByPlaceholderText('Prénom'), values.firstName);
  await fireEvent.changeText(screen.getByPlaceholderText('Nom'), values.lastName);
  await fireEvent.changeText(screen.getByPlaceholderText('Email'), values.email);
  await fireEvent.changeText(screen.getByPlaceholderText('Mot de passe (8 caractères minimum)'), values.password);
  await fireEvent.changeText(screen.getByPlaceholderText('Téléphone (ex: 074123456)'), values.phoneNumber);
  await fireEvent.changeText(screen.getByPlaceholderText('Date de naissance (AAAA-MM-JJ)'), values.birthDate);
  await fireEvent.press(screen.getByText("J'accepte les conditions d'utilisation"));
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
    mockedGetDocs.mockResolvedValue({ empty: true });
    mockedCreateUser.mockResolvedValue({ user: { uid: 'new-uid' } });
  });

  it('crée le compte quand tout est valide et unique', async () => {
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByText('Créer mon compte'));

    await waitFor(() => expect(mockedCreateUser).toHaveBeenCalledWith({}, 'jean@example.com', 'secret123'));
    expect(mockedSetDoc).toHaveBeenCalled();
  });

  it('refuse un numéro de téléphone déjà utilisé sans créer le compte', async () => {
    mockedGetDocs.mockResolvedValueOnce({ empty: false }); // requête téléphone
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByText('Créer mon compte'));

    expect(await screen.findByText('Ce numéro de téléphone est déjà utilisé.')).toBeTruthy();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('refuse un email déjà utilisé sans créer le compte', async () => {
    mockedGetDocs
      .mockResolvedValueOnce({ empty: true }) // téléphone libre
      .mockResolvedValueOnce({ empty: false }); // email déjà pris
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByText('Créer mon compte'));

    expect(await screen.findByText('Cette adresse email est déjà utilisée.')).toBeTruthy();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('bloque la soumission pour un utilisateur de moins de 18 ans', async () => {
    const now = new Date();
    const seventeenYearsAgo = `${now.getFullYear() - 17}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm({ birthDate: seventeenYearsAgo });

    expect(screen.getByText('Créer mon compte').parent?.props.accessibilityState?.disabled).toBe(true);
  });

  it('mappe auth/email-already-in-use vers un message clair même si la pré-vérification est passée', async () => {
    mockedCreateUser.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await renderWithNavigation(<SignUpScreen />);
    await fillValidForm();
    await fireEvent.press(screen.getByText('Créer mon compte'));

    expect(await screen.findByText('Cette adresse email est déjà utilisée.')).toBeTruthy();
  });
});
