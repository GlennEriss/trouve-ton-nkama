import { screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getDocs } from '@react-native-firebase/firestore';
import MyListingsScreen from '../MyListingsScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;

describe('MyListingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  it("affiche un message vide sans annonce", async () => {
    mockedGetDocs.mockResolvedValue({ docs: [] });
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText("Vous n'avez pas encore d'annonce.")).toBeTruthy();
  });

  it('affiche le statut de modération de chaque annonce', async () => {
    mockedGetDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'p1',
            data: () => ({
              title: 'Maison A',
              price: 100000,
              typeProperty: 'Home',
              status: 'FOR_RENT',
              moderationStatus: 'PENDING',
              state: 'IN_PROGRESS',
              city: 'Libreville',
            }),
          },
        ],
      })
      .mockResolvedValueOnce({ docs: [] });

    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Maison A')).toBeTruthy();
    expect(await screen.findByText('En attente de modération')).toBeTruthy();
  });

  it('ouvre le site web au tap sur "Continuer sur le site web"', async () => {
    mockedGetDocs.mockResolvedValue({ docs: [] });
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByText('Continuer sur le site web'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('/announcer/ads'));
  });
});
