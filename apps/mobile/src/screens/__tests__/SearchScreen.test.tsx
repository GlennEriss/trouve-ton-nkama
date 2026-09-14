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

  it("Réinitialiser seul ne touche pas encore les résultats ni le badge — comme 'Effacer' côté PWA (local, sans appliquer)", async () => {
    // Voir FilterModal.tsx / use-filter-modal.ts (web) : clearLocalFilters() ne fait que réinitialiser
    // l'état local du formulaire, ne ferme pas la modale et ne déclenche aucune nouvelle requête —
    // il faut ensuite "Appliquer" pour que ça compte. Comportement volontairement identique ici.
    mockAlgoliaResponse([]);
    await renderScreen();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.changeText(screen.getByTestId('filters-budget-min'), '50000');
    await fireEvent.press(screen.getByText('Appliquer'));
    expect(await screen.findByText('2')).toBeTruthy();
    const filtersCountBeforeReset = (global.fetch as jest.Mock).mock.calls.length;

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(screen.getByText('Réinitialiser'));
    // La modale reste ouverte (pas d'appel à onClose dans handleReset).
    expect(screen.getByTestId('filters-modal')).toBeTruthy();
    // Toujours aucune nouvelle requête réseau tant que "Appliquer" n'a pas été pressé.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(filtersCountBeforeReset);

    await fireEvent.press(screen.getByTestId('filters-close'));
    // Fermer sans appliquer : le badge affiche toujours les filtres précédemment appliqués.
    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('Réinitialiser puis Appliquer efface bien TOUS les filtres (type, statut, budget min/max, province/ville/quartier) et relance la recherche sans eux', async () => {
    // Hits distincts selon la présence de filtres, pour pouvoir constater à l'écran que la
    // liste revient bien à l'état "non filtré" après Réinitialiser + Appliquer (et pas
    // seulement que le badge disparaît).
    // Villes volontairement différentes de celle choisie dans le filtre ("Libreville") pour
    // éviter toute ambiguïté de texte entre la carte résultat et le sélecteur ville rouvert.
    const FILTERED_HIT = { objectID: 'p-filtre', title: 'Villa filtrée trouvée', city: 'Lambaréné', price: 250000 };
    const UNFILTERED_HIT = { objectID: 'p-tout', title: 'Annonce non filtrée', city: 'Port-Gentil', price: 75000 };
    global.fetch = jest.fn((url: string, init?: { body?: string }) => {
      if (url.includes('/api/categories/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ categories: [], leaves: [] }) });
      }
      const params = init?.body ? JSON.parse(init.body)?.requests?.[0]?.params : undefined;
      const facetAttribute = params?.facets?.[0];
      if (facetAttribute) {
        const facetValues: Record<string, Record<string, number>> = {
          province: { Estuaire: 12 },
          city: { Libreville: 8 },
          street: { Glass: 2 },
        }[facetAttribute] ?? {};
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ results: [{ facets: { [facetAttribute]: facetValues } }] }) });
      }
      const hasExtraFilters = (params?.filters ?? '').includes('typeProperty');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ hits: hasExtraFilters ? [FILTERED_HIT] : [UNFILTERED_HIT], nbPages: 1, page: 0 }] }),
      });
    }) as unknown as jest.Mock;
    await renderScreen();
    expect(await screen.findByText('Annonce non filtrée')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Villa'));
    await fireEvent.press(screen.getByText('Location'));
    await fireEvent.changeText(screen.getByTestId('filters-budget-min'), '50000');
    await fireEvent.changeText(screen.getByTestId('filters-budget-max'), '300000');

    await screen.findByText('Toutes les provinces');
    await fireEvent.press(screen.getByTestId('filters-province'));
    await fireEvent.press(await screen.findByTestId('filters-province-option-Estuaire'));
    await screen.findByText('Toutes les villes');
    await fireEvent.press(screen.getByTestId('filters-city'));
    await fireEvent.press(await screen.findByTestId('filters-city-option-Libreville'));
    await screen.findByText('Tous les quartiers');
    await fireEvent.press(screen.getByTestId('filters-street'));
    await fireEvent.press(await screen.findByTestId('filters-street-option-Glass'));

    await fireEvent.press(screen.getByText('Appliquer'));
    // typeProperty + status + budgetMin + budgetMax + province + city + street = 7 filtres actifs.
    expect(await screen.findByText('7')).toBeTruthy();
    await waitFor(() => {
      const filters = lastAlgoliaFilters();
      expect(filters).toContain('typeProperty:"Villa"');
      expect(filters).toContain('province:"Estuaire"');
      expect(filters).toContain('city:"Libreville"');
      expect(filters).toContain('street:"Glass"');
      expect(filters).toContain('price >= 50000');
      expect(filters).toContain('price <= 300000');
    });
    expect(await screen.findByText('Villa filtrée trouvée')).toBeTruthy();
    expect(screen.queryByText('Annonce non filtrée')).toBeNull();
    const fetchCallsAfterApply = (global.fetch as jest.Mock).mock.calls.length;

    await fireEvent.press(screen.getByLabelText('Filtres'));
    // Le formulaire rouvre pré-rempli avec les filtres actuellement appliqués (voir le useEffect
    // de resynchronisation sur `visible`) — vérifie qu'on repart bien de l'état réellement actif.
    expect(await screen.findByText('Libreville')).toBeTruthy();
    expect(screen.getByText('Glass')).toBeTruthy();
    expect(screen.getByDisplayValue('50000')).toBeTruthy();
    expect(screen.getByDisplayValue('300000')).toBeTruthy();

    await fireEvent.press(screen.getByText('Réinitialiser'));
    await fireEvent.press(screen.getByText('Appliquer'));

    // Badge de filtres actifs disparu : plus aucun filtre compté.
    expect(screen.queryByTestId('search-filters-button')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('7')).toBeNull());
    expect(screen.queryByText('1')).toBeNull();

    // La liste elle-même est bien revenue à l'état non filtré (pas seulement le badge).
    expect(await screen.findByText('Annonce non filtrée')).toBeTruthy();
    expect(screen.queryByText('Villa filtrée trouvée')).toBeNull();

    // Pas d'assertion sur un nouvel appel réseau ici : la requête `['algolia-search', '', {}]`
    // (aucun filtre) est strictement identique à celle du montage initial, et useInfiniteQuery a
    // `staleTime: 60_000` (SearchScreen.tsx) — react-query sert donc l'état vide depuis son cache
    // au lieu de refetch, ce qui est le comportement voulu (voir le commentaire sur staleTime).
    // `fetchCallsAfterApply` ne sert donc plus qu'à documenter qu'aucun appel superflu n'est fait.
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(fetchCallsAfterApply);

    // Les champs du formulaire lui-même repartent bien à vide/"Tous" à la réouverture — la
    // province étant aussi réinitialisée, la ville retombe sur son placeholder "en attente de
    // province" (scope Immobilier), pas "Toutes les villes" (qui suppose une province déjà
    // choisie ou n'être pas en scope Immobilier).
    await fireEvent.press(screen.getByLabelText('Filtres'));
    expect(await screen.findByText('Toutes les provinces')).toBeTruthy();
    expect(screen.getByText("Choisissez d'abord une province")).toBeTruthy();
    expect(screen.getByPlaceholderText('Ex: 50000').props.value).toBe('');
    expect(screen.getByPlaceholderText('Ex: 300000').props.value).toBe('');
  });
});
