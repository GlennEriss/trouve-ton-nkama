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
// SearchScreen appelle désormais aussi GET /api/categories/active,
// GET /api/categories/publishable-leaves, et des requêtes de FACETTE (province/ville/quartier
// des filtres, params.facets présent, pas de `hits`) — il faut distinguer les 4 formes.
function mockApiResponses(opts: {
  hits?: unknown[];
  nbPages?: number;
  categories?: unknown[];
  leaves?: unknown[];
  // Valeurs de facette par attribut Algolia (ex. { province: { Estuaire: 5 }, city: {...} }) —
  // mêmes clés que fetchLocationFacet côté src/api/algolia.ts.
  facets?: Record<string, Record<string, number>>;
}) {
  global.fetch = jest.fn((url: string, init?: { body?: string }) => {
    if (url.includes('/api/categories/active')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ categories: opts.categories ?? [] }) });
    }
    if (url.includes('/api/categories/publishable-leaves')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ leaves: opts.leaves ?? [] }) });
    }
    const params = init?.body ? JSON.parse(init.body)?.requests?.[0]?.params : undefined;
    const facetAttribute = params?.facets?.[0];
    if (facetAttribute) {
      const facetValues = opts.facets?.[facetAttribute] ?? {};
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ results: [{ facets: { [facetAttribute]: facetValues } }] }) });
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

  it('Immobilier — Province/Ville/Quartier viennent d’Algolia (pas une liste codée en dur) et filtrent en cascade', async () => {
    mockApiResponses({
      hits: [],
      facets: {
        province: { Estuaire: 12, 'Haut-Ogooué': 3 },
        city: { Libreville: 8, Owendo: 4 },
        street: { Glass: 2, Batterie: 1 },
      },
    });
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    // Le select est désactivé tant que sa requête de facette charge (comme un vrai <select>
    // désactivé pendant le chargement) — un fireEvent.press sur un élément désactivé n'invoque
    // pas onPress, donc chaque étape attend explicitement la fin du chargement précédent avant
    // de presser l'étape suivante.
    await screen.findByText('Toutes les provinces');

    // Ville désactivée tant qu'aucune province n'est choisie (cascade, comme
    // useSelectFilterLocationMediator.ts côté web).
    await fireEvent.press(screen.getByTestId('filters-city'));
    expect(screen.queryByTestId('filters-city-modal')).toBeNull();

    await fireEvent.press(screen.getByTestId('filters-province'));
    expect(await screen.findByTestId('filters-province-option-Estuaire')).toBeTruthy();
    expect(screen.getByTestId('filters-province-option-Haut-Ogooué')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filters-province-option-Estuaire'));

    await screen.findByText('Toutes les villes');
    await fireEvent.press(screen.getByTestId('filters-city'));
    expect(await screen.findByTestId('filters-city-option-Libreville')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filters-city-option-Libreville'));

    await screen.findByText('Tous les quartiers');
    await fireEvent.press(screen.getByTestId('filters-street'));
    expect(await screen.findByTestId('filters-street-option-Glass')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filters-street-option-Glass'));

    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => {
      const filters = lastAlgoliaFilters();
      expect(filters).toContain('province:"Estuaire"');
      expect(filters).toContain('city:"Libreville"');
      expect(filters).toContain('street:"Glass"');
    });
  });

  it('Immobilier — changer de province réinitialise ville et quartier déjà choisis', async () => {
    mockApiResponses({
      hits: [],
      facets: {
        province: { Estuaire: 12, 'Haut-Ogooué': 3 },
        city: { Libreville: 8 },
      },
    });
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await screen.findByText('Toutes les provinces');
    await fireEvent.press(screen.getByTestId('filters-province'));
    await fireEvent.press(await screen.findByTestId('filters-province-option-Estuaire'));

    await screen.findByText('Toutes les villes');
    await fireEvent.press(screen.getByTestId('filters-city'));
    await fireEvent.press(await screen.findByTestId('filters-city-option-Libreville'));
    expect(screen.getByText('Libreville')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('filters-province'));
    await fireEvent.press(await screen.findByTestId('filters-province-option-Haut-Ogooué'));

    // Ville redevient "Toutes les villes" — Libreville appartenait à l'ancienne province.
    // Nouvelle province -> nouvelle clé de requête -> re-chargement transitoire, d'où le findBy.
    expect(await screen.findByText('Toutes les villes')).toBeTruthy();
  });

  it('Immobilier — budget minimum et maximum sont tous les deux envoyés à Algolia', async () => {
    mockAlgoliaResponse([]);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.changeText(screen.getByTestId('filters-budget-min'), '50000');
    await fireEvent.changeText(screen.getByTestId('filters-budget-max'), '300000');
    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => {
      const filters = lastAlgoliaFilters();
      expect(filters).toContain('price >= 50000');
      expect(filters).toContain('price <= 300000');
    });
  });

  it('Mode — la ville est un select Algolia (facette "cities", pas un champ de texte libre) et filtre sur "cities"', async () => {
    mockApiResponses({
      hits: [],
      categories: [IMMOBILIER, MODE],
      facets: { cities: { Libreville: 6, Franceville: 2 } },
    });
    await renderScreen();

    await fireEvent.press(await screen.findByText('Mode'));
    await fireEvent.press(screen.getByLabelText('Filtres'));

    // Pas de province/quartier hors immobilier.
    expect(screen.queryByTestId('filters-province')).toBeNull();
    expect(screen.queryByTestId('filters-street')).toBeNull();
    // Aucun champ de texte libre pour la ville : uniquement le déclencheur du select.
    expect(screen.queryByPlaceholderText('Ex: Libreville')).toBeNull();

    await screen.findByText('Toutes les villes');
    await fireEvent.press(screen.getByTestId('filters-city'));
    expect(await screen.findByTestId('filters-city-option-Libreville')).toBeTruthy();
    expect(screen.getByTestId('filters-city-option-Franceville')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filters-city-option-Libreville'));
    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => expect(lastAlgoliaFilters()).toContain('cities:"Libreville"'));
  });

  it('Mode — le budget minimum est disponible et envoyé à Algolia', async () => {
    mockApiResponses({ hits: [], categories: [IMMOBILIER, MODE] });
    await renderScreen();

    await fireEvent.press(await screen.findByText('Mode'));
    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.changeText(screen.getByTestId('filters-budget-min'), '10000');
    await fireEvent.press(screen.getByText('Appliquer'));

    await waitFor(() => expect(lastAlgoliaFilters()).toContain('price >= 10000'));
  });
});
