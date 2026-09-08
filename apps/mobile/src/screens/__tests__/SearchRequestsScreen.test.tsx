import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getDocs } from '@react-native-firebase/firestore';
import SearchRequestsScreen from '../SearchRequestsScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;

describe('SearchRequestsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedGetDocs.mockResolvedValue({ docs: [] });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, id: 'sr-new' }),
    });
  });

  it('affiche un message vide sans demande', async () => {
    await renderWithProviders(<SearchRequestsScreen />);
    expect(await screen.findByText('Aucune demande pour l\'instant.')).toBeTruthy();
  });

  it('affiche les demandes existantes avec leur budget formaté', async () => {
    mockedGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'sr-1',
          data: () => ({
            typeProperty: 'Home',
            transactionType: 'FOR_RENT',
            city: 'Libreville',
            province: 'Estuaire',
            budgetMinXaf: 0,
            budgetMaxXaf: 150000,
            description: 'Recherche une maison.',
            whatsappContact: '+24174123456',
          }),
        },
      ],
    });
    await renderWithProviders(<SearchRequestsScreen />);
    expect(await screen.findByText('Recherche une maison.')).toBeTruthy();
  });

  it('publie une nouvelle demande gratuitement (mention "gratuit", pas de crédits)', async () => {
    await renderWithProviders(<SearchRequestsScreen />);
    await fireEvent.press(screen.getByText('+ Publier'));

    expect(await screen.findByText(/Gratuit pour le lancement/)).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText('Ex: 150000'), '200000');
    await fireEvent.changeText(
      screen.getByPlaceholderText('Ex: Je cherche une maison 2 chambres proche du centre-ville...'),
      'Je cherche un studio meublé.',
    );
    await fireEvent.changeText(screen.getByPlaceholderText('074 XX XX XX'), '074123456');
    await fireEvent.press(screen.getByText('Publier ma demande'));

    await waitFor(() => expect(global.fetch as jest.Mock).toHaveBeenCalled());
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/search-requests/mobile-create');
    const body = JSON.parse(options.body);
    expect(body.budgetMaxXaf).toBe(200000);
    expect(body.whatsappContact).toBe('074123456');
  });
});
