import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import SearchScreen from '../SearchScreen';

jest.mock('@react-native-firebase/auth');

const Stack = createNativeStackNavigator();

function DetailStub() {
  return <Text>Écran détail</Text>;
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="SearchHome" component={SearchScreen} />
          <Stack.Screen name="ListingDetail" component={DetailStub} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

function mockAlgoliaResponse(hits: unknown[], nbPages = 1) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ results: [{ hits, nbPages, page: 0 }] }),
  });
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  });

  it('affiche les résultats de recherche', async () => {
    mockAlgoliaResponse([{ objectID: 'p1', title: 'Belle maison', city: 'Libreville', price: 100000, status: 'FOR_RENT' }]);
    await renderScreen();

    expect(await screen.findByText('Belle maison')).toBeTruthy();
  });

  it('navigue vers le détail au tap sur un résultat', async () => {
    mockAlgoliaResponse([{ objectID: 'p1', title: 'Belle maison', city: 'Libreville', price: 100000 }]);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Belle maison'));
    expect(await screen.findByText('Écran détail')).toBeTruthy();
  });

  it('affiche le nombre de filtres actifs après application', async () => {
    mockAlgoliaResponse([]);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.press(screen.getByText('Location'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('envoie les filtres appliqués dans la requête Algolia (type + budget)', async () => {
    mockAlgoliaResponse([]);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.changeText(screen.getByPlaceholderText('Ex: 300000'), '500000');
    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    const lastCall = (global.fetch as jest.Mock).mock.calls[(global.fetch as jest.Mock).mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    const filters = body.requests[0].params.filters;
    expect(filters).toContain('typeProperty:"Villa"');
    expect(filters).toContain('price <= 500000');
  });

  it('réinitialise les filtres', async () => {
    mockAlgoliaResponse([]);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.press(screen.getByText('Appliquer'));
    expect(await screen.findByText('1')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(screen.getByText('Réinitialiser'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(screen.queryByText('1')).toBeNull();
  });
});
