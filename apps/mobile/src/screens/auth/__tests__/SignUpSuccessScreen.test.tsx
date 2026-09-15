import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import SignUpSuccessScreen from '../SignUpSuccessScreen';
import { renderWithNavigation } from '../../../test-utils/renderWithNavigation';
import { apiFetch } from '../../../api/client';

jest.mock('../../../api/client', () => ({
  apiFetch: jest.fn(),
  API_BASE_URL: 'http://localhost:3000',
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.Mock;
const mockedPopToTop = jest.fn();

// Miroir de RegisterSuccess.tsx (web) — voir [[feedback-mobile-reuse-pwa-design]].
describe('SignUpSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRoute as jest.Mock).mockReturnValue({ params: { uid: 'uid-1' } });
    (useNavigation as jest.Mock).mockReturnValue({ popToTop: mockedPopToTop });
  });

  it('"Continuer" referme toute la pile d\'auth (popToTop) plutôt qu\'un simple goBack — voir la note sur getParent()', async () => {
    await renderWithNavigation(<SignUpSuccessScreen />);
    await fireEvent.press(screen.getByText('Continuer'));
    expect(mockedPopToTop).toHaveBeenCalled();
  });

  it('affiche le message de succès', async () => {
    await renderWithNavigation(<SignUpSuccessScreen />);
    expect(screen.getByText('Inscription réussie !')).toBeTruthy();
  });

  it('vérifier le statut appelle /api/verify-email avec le uid et affiche le résultat', async () => {
    mockedApiFetch.mockResolvedValueOnce({ emailVerified: true });
    await renderWithNavigation(<SignUpSuccessScreen />);

    await fireEvent.press(screen.getByText('Vérifier le statut'));

    await waitFor(() =>
      expect(mockedApiFetch).toHaveBeenCalledWith('/api/verify-email', { method: 'POST', body: { uid: 'uid-1' } }),
    );
    expect(await screen.findByText(/Votre email a été vérifié/)).toBeTruthy();
  });

  it('renvoyer l\'email appelle /api/auth/send-verification-email et démarre le compte à rebours', async () => {
    mockedApiFetch.mockResolvedValueOnce({});
    await renderWithNavigation(<SignUpSuccessScreen />);

    await fireEvent.press(screen.getByText("Renvoyer l'email"));

    await waitFor(() =>
      expect(mockedApiFetch).toHaveBeenCalledWith('/api/auth/send-verification-email', {
        method: 'POST',
        body: { uid: 'uid-1' },
      }),
    );
    expect(await screen.findByText('Renvoyer dans 60s')).toBeTruthy();
  });
});
