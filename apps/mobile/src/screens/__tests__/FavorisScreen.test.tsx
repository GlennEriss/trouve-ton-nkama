import { screen, waitFor, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import FavorisScreen from '../FavorisScreen';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <FavorisScreen />
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

describe('FavorisScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'prop-1', title: 'Maison favorite', city: 'Libreville', price: 100000 }),
    });
  });

  it('affiche un message vide sans favoris', async () => {
    await renderScreen();
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];
    await act(async () => {
      onNext({ data: () => ({ favoris: [] }) });
    });

    expect(await screen.findByText('Aucune annonce en favoris pour l\'instant.')).toBeTruthy();
  });

  it('charge et affiche chaque annonce favorite', async () => {
    await renderScreen();
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];
    await act(async () => {
      onNext({ data: () => ({ favoris: ['prop-1'] }) });
    });

    expect(await screen.findByText('Maison favorite')).toBeTruthy();
  });
});
