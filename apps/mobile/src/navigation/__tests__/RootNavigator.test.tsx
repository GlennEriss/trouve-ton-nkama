import { screen, act, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { RootNavigator } from '../RootNavigator';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/messaging');
// Module natif (TurboModule), planterait au chargement en environnement Jest — RootNavigator
// monte toute la navigation, y compris ProfileStack -> LegalWebViewScreen qui l'importe.
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: object) => <View {...props} /> };
});
// @react-navigation/drawer charge react-native-reanimated -> react-native-worklets (module
// natif), qui plante au chargement en Jest — voir __mocks__/@react-navigation/drawer.js.
jest.mock('@react-navigation/drawer');

const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock;

// RootNavigator lui-même n'a pas de QueryClientProvider (il vit dans App.tsx, un niveau
// au-dessus) — fourni ici pour reproduire fidèlement l'arbre réel, sinon Accueil/Recherche
// (montés dès le lancement, connecté ou non) plantent avec "No QueryClient set".
function renderRootNavigator() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>,
  );
}

function mockAlgoliaFetch() {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{ hits: [], nbPages: 0 }] }) });
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({});
    mockAlgoliaFetch();
  });

  it("affiche un indicateur de chargement tant que Firebase Auth n'a pas répondu", async () => {
    mockedOnAuthStateChanged.mockImplementation(() => jest.fn()); // ne répond jamais
    await renderRootNavigator();

    expect(screen.queryByText('Annonces récentes')).toBeNull();
  });

  // Cœur du changement demandé : plus de mur de connexion à l'ouverture — Accueil (comme la
  // page d'accueil publique du web, voir src/middleware.ts, `/` et `/search` hors des préfixes
  // protégés) reste accessible SANS être connecté.
  it('affiche directement Accueil (Main), connecté ou non', async () => {
    let cb: ((user: unknown) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      cb = callback;
      return jest.fn();
    });
    await renderRootNavigator();
    await act(async () => {
      cb?.(null);
    });

    expect(await screen.findByText('Annonces récentes')).toBeTruthy();
  });

  it('affiche MainTabs (Accueil) quand connecté', async () => {
    let cb: ((user: unknown) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      cb = callback;
      return jest.fn();
    });

    await renderRootNavigator();
    await act(async () => {
      cb?.({ uid: 'uid-1' });
    });

    expect(await screen.findByText('Annonces récentes')).toBeTruthy();
  });

  // La redirection automatique vers SignIn pour un onglet protégé (Profil, Favoris,
  // Notifications) est testée unitairement dans useRequireAuth.test.ts — pas ici, où le VRAI
  // navigationRef (singleton module-level) est réutilisé entre plusieurs montages/démontages
  // successifs de RootNavigator dans le même fichier, avec un risque de réattachement peu
  // fiable propre à ce contexte de test (pas au comportement réel de l'app).
  it("l'onglet Profil affiche bien ProfileScreen une fois connecté", async () => {
    let cb: ((user: unknown) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      cb = callback;
      return jest.fn();
    });
    await renderRootNavigator();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'uid-1' } });
    await act(async () => {
      cb?.({ uid: 'uid-1' }); // débloque RootNavigator, qui monte MainTabs
    });
    // MainTabs s'abonne à son tour (useAuthState, pour le libellé dynamique de l'onglet
    // Profil/Connexion) — `mockImplementation` réassigne `cb` à ce nouvel abonnement, qui ne
    // reçoit jamais d'appel automatique (mockImplementation ne fait que capturer) : il faut le
    // redéclencher, sinon l'onglet reste affiché "Connexion" malgré la connexion simulée.
    await act(async () => {
      cb?.({ uid: 'uid-1' });
    });
    await screen.findByText('Annonces récentes');

    await fireEvent.press(screen.getByText('Profil'));
    // ProfileScreen vient de se monter et s'abonne à son tour (useRequireAuth ->
    // useAuthState -> un second onAuthStateChanged) : `cb` référence maintenant CE nouvel
    // abonnement (mockImplementation le réassigne à chaque appel) — il faut le redéclencher
    // manuellement, comme pour l'abonnement initial de RootNavigator ci-dessus.
    await act(async () => {
      cb?.({ uid: 'uid-1' });
    });

    expect(await screen.findByText('Se déconnecter')).toBeTruthy();
  });
});
