import { screen, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import ForgotPasswordScreen from '../ForgotPasswordScreen';

jest.mock('@react-native-firebase/auth');

const mockedSend = sendPasswordResetEmail as jest.Mock;

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
  });

  it('affiche la confirmation générique après un envoi réussi', async () => {
    mockedSend.mockResolvedValue(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    await fireEvent.press(screen.getByText('Envoyer le lien'));

    expect(mockedSend).toHaveBeenCalledWith({}, 'test@example.com');
    expect(await screen.findByText('Email envoyé')).toBeTruthy();
  });

  // Ne jamais révéler si un email existe ou non : même l'échec auth/user-not-found affiche le
  // message générique de succès, volontairement (voir le commentaire dans le composant).
  it("affiche aussi la confirmation générique si l'email n'existe pas (pas de fuite d'information)", async () => {
    mockedSend.mockRejectedValue({ code: 'auth/user-not-found' });
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'inconnu@example.com');
    await fireEvent.press(screen.getByText('Envoyer le lien'));

    expect(await screen.findByText('Email envoyé')).toBeTruthy();
  });

  it('affiche une erreur explicite pour un email malformé', async () => {
    mockedSend.mockRejectedValue({ code: 'auth/invalid-email' });
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'pas-un-email');
    await fireEvent.press(screen.getByText('Envoyer le lien'));

    expect(await screen.findByText("L'adresse email n'est pas valide.")).toBeTruthy();
  });
});
