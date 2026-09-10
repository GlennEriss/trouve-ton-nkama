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

// Contrairement à mockAlgoliaResponse (une seule forme de réponse pour tous les appels),
// SearchScreen appelle désormais aussi GET /api/categories/active et
// GET /api/categories/publishable-leaves — il faut distinguer par URL pour tester les pills
// catégorie/sous-catégorie avec de vraies données.
function mockApiResponses(opts: { hits?: unknown[]; nbPages?: number; categories?: unknown[]; leaves?: unknown[] }) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/api/categories/active')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ categories: opts.categories ?? [] }) });
    }
    if (url.includes('/api/categories/publishable-leaves')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ leaves: opts.leaves ?? [] }) });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ hits: opts.hits ?? [], nbPages: opts.nbPages ?? 1, page: 0 }] }),
    });
  }) as unknown as jest.Mock;
}

function lastAlgoliaFilters(): string {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const searchCalls = calls.filter(([url]) => !url.includes('/api/categories/'));
  const lastCall = searchCalls[searchCalls.length - 1];
  const body = JSON.parse(lastCall[1].body);
  return body.requests[0].params.filters;
}

const IMMOBILIER = { id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 };
const MODE = { id: 'mode', slug: 'mode', name: 'Mode', icon: null, order: 10 };
const CHAUSSURES_LEAF = {
  id: 'chaussures',
  slug: 'chaussures',
  name: 'Chaussures',
  rootId: 'mode',
  rootName: 'Mode',
  locationPrecision: 'city',
  attributeSchema: [
    { key: 'pointure', label: 'Pointure', type: 'enum', options: ['40', '41'], required: true, facetable: true, primary: true },
    { key: 'etat', label: 'État', type: 'enum', options: ['Neuf', 'Bon état'], required: true, facetable: true, primary: false },
  ],
};
const VETEMENTS_LEAF = {
  id: 'vetements',
  slug: 'vetements',
  name: 'Vêtements',
  rootId: 'mode',
  rootName: 'Mode',
  locationPrecision: 'city',
  attributeSchema: [],
};

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

  it('affiche les pills de catégorie racine et filtre sur categoryPath.lvl0 à la sélection', async () => {
    mockApiResponses({ hits: [], categories: [IMMOBILIER, MODE] });
    await renderScreen();

    expect(await screen.findByText('Toutes catégories')).toBeTruthy();
    expect(await screen.findByText('Immobilier')).toBeTruthy();
    expect(await screen.findByText('Mode')).toBeTruthy();

    await fireEvent.press(screen.getByText('Mode'));
    await waitFor(() => expect(lastAlgoliaFilters()).toContain('categoryPath.lvl0:"Mode"'));
  });

  it('affiche les pills de sous-catégorie Mode uniquement quand Mode est actif, et filtre sur categoryId', async () => {
    mockApiResponses({ hits: [], categories: [IMMOBILIER, MODE], leaves: [CHAUSSURES_LEAF, VETEMENTS_LEAF] });
    await renderScreen();

    await screen.findByText('Mode');
    expect(screen.queryByTestId('subcategory-toggle')).toBeNull();

    await fireEvent.press(screen.getByText('Mode'));
    // Sous-catégories repliées par défaut (ChipExpander) : le toggle apparaît, pas les pills.
    expect(await screen.findByTestId('subcategory-toggle')).toBeTruthy();
    expect(screen.queryByTestId('leaf-pill-chaussures')).toBeNull();

    await fireEvent.press(screen.getByTestId('subcategory-toggle'));
    expect(await screen.findByTestId('leaf-pill-chaussures')).toBeTruthy();
    expect(screen.getByTestId('leaf-pill-vetements')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('leaf-pill-chaussures'));
    await waitFor(() => expect(lastAlgoliaFilters()).toContain('categoryId:"chaussures"'));
  });

  it('masque les filtres immobilier et affiche les attributs dynamiques de la feuille Mode active', async () => {
    mockApiResponses({ hits: [], categories: [IMMOBILIER, MODE], leaves: [CHAUSSURES_LEAF, VETEMENTS_LEAF] });
    await renderScreen();

    await fireEvent.press(await screen.findByText('Mode'));
    await fireEvent.press(await screen.findByTestId('subcategory-toggle'));
    await fireEvent.press(await screen.findByTestId('leaf-pill-chaussures'));

    await fireEvent.press(screen.getByLabelText('Filtres'));
    expect(screen.queryByText('Type de bien')).toBeNull();
    expect(screen.queryByText('Location ou vente')).toBeNull();
    expect(await screen.findByText('Pointure')).toBeTruthy();
    expect(screen.getByText('État')).toBeTruthy();

    await fireEvent.press(screen.getByText('40'));
    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => expect(lastAlgoliaFilters()).toContain('attributes.pointure:"40"'));
  });

  it('réinitialise tous les filtres (dont le type immobilier) au changement de catégorie racine', async () => {
    mockApiResponses({ hits: [], categories: [IMMOBILIER, MODE] });
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.press(screen.getByText('Appliquer'));
    expect(await screen.findByText('1')).toBeTruthy();

    await fireEvent.press(screen.getByText('Mode'));

    expect(screen.queryByText('1')).toBeNull();
    await waitFor(() => expect(lastAlgoliaFilters()).not.toContain('typeProperty'));
  });
});
