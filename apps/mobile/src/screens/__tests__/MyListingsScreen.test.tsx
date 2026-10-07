import { screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { Alert, Linking, StyleSheet } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getDocs, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import MyListingsScreen from '../MyListingsScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { navigate: jest.fn(), isReady: jest.fn(() => true) },
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedGetDocs = getDocs as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedDeleteDoc = deleteDoc as jest.Mock;
const mockedNavigate = navigationRef.navigate as jest.Mock;

function listingDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

const publicListing = listingDoc('p1', {
  title: 'Maison A',
  price: 100000,
  area: 90,
  typeProperty: 'Home',
  status: 'FOR_RENT',
  moderationStatus: 'APPROVED',
  state: 'IN_PROGRESS',
  city: 'Libreville',
  province: 'Estuaire',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
});

const pendingListing = listingDoc('p2', {
  title: 'Studio B',
  price: 50000,
  area: 30,
  typeProperty: 'Studio',
  status: 'FOR_SALE',
  moderationStatus: 'PENDING',
  state: 'IN_PROGRESS',
  city: 'Franceville',
  createdAt: new Date('2026-01-03'),
});

const rejectedListing = listingDoc('p3', {
  title: 'Terrain C',
  price: 30000,
  typeProperty: 'Land',
  status: 'FOR_SALE',
  moderationStatus: 'REJECTED',
  rejectionReason: 'Photos manquantes',
  state: 'ARCHIVED',
  city: 'Port-Gentil',
});

const marketplaceListing = listingDoc('p4', {
  title: 'Chaussures D',
  price: 20000,
  categoryId: 'cat1',
  categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Chaussures' },
  status: 'FOR_SALE',
  moderationStatus: 'APPROVED',
  state: 'IN_PROGRESS',
  city: 'Libreville',
  isPromoted: true,
});

function mockListings(docs: ReturnType<typeof listingDoc>[]) {
  mockedGetDocs.mockResolvedValueOnce({ docs }).mockResolvedValueOnce({ docs: [] });
}

async function pressAlertButton(alertSpy: jest.SpyInstance, buttonText: string) {
  const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = lastCall[2] as { text: string; onPress?: () => void }[];
  const button = buttons.find((b) => b.text === buttonText);
  await act(async () => {
    await button?.onPress?.();
  });
}

describe('MyListingsScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("affiche un message vide sans dupliquer le CTA de publication de la navigation", async () => {
    mockListings([]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Aucune annonce trouvée')).toBeTruthy();
    expect(screen.getByText('Ajustez vos filtres ou utilisez le bouton + pour publier.')).toBeTruthy();
    expect(screen.queryByText('Publier une annonce')).toBeNull();
  });

  it('affiche le titre, le prix, le statut de modération et le badge état de chaque annonce', async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Maison A')).toBeTruthy();
    expect(screen.getByText('100 000 FCFA')).toBeTruthy();
    expect(screen.getByText('Publiée')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Maison • 90 m²')).toBeTruthy();
  });

  it('affiche le motif de rejet pour une annonce rejetée', async () => {
    mockListings([rejectedListing]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Terrain C')).toBeTruthy();
    expect(screen.getByText('Motif du rejet : Photos manquantes')).toBeTruthy();
  });

  it('sépare Immobilier et Mode par onglet, avec le bon compte', async () => {
    mockListings([publicListing, marketplaceListing]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Immobilier (1)')).toBeTruthy();
    expect(screen.getByText('Mode (1)')).toBeTruthy();
    expect(screen.getByText('Maison A')).toBeTruthy();
    expect(screen.queryByText('Chaussures D')).toBeNull();

    await fireEvent.press(screen.getByTestId('my-listings-scope-marketplace'));
    expect(await screen.findByText('Chaussures D')).toBeTruthy();
    expect(screen.queryByText('Maison A')).toBeNull();
  });

  it('affiche les quatre KPI dans un rail horizontal avec les valeurs Immobilier puis Mode', async () => {
    mockListings([publicListing, pendingListing, rejectedListing, marketplaceListing]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByLabelText('3 total annonces')).toBeTruthy();
    const statsStrip = screen.getByTestId('my-listings-stats-strip');
    expect(statsStrip.props.horizontal).toBe(true);
    expect(StyleSheet.flatten(statsStrip.props.style)).toMatchObject({ height: 104, flexShrink: 0 });
    expect(within(screen.getByTestId('my-listings-stat-total-header')).getByText('Total annonces')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-total')).getByText('3')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-active')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-archived')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-promoted')).getByText('0')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('my-listings-scope-marketplace'));

    expect(within(screen.getByTestId('my-listings-stat-total')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-active')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-archived')).getByText('0')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-promoted')).getByText('1')).toBeTruthy();
  });

  it('conserve les libellés complets et les valeurs à zéro', async () => {
    mockListings([]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Total annonces')).toBeTruthy();
    expect(screen.getByText('Actives')).toBeTruthy();
    expect(screen.getByText('Archivées')).toBeTruthy();
    expect(screen.getByText('Promues')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stats-strip')).getAllByText('0')).toHaveLength(4);
    expect(screen.getByLabelText('0 total annonces')).toBeTruthy();
  });

  it('affiche sans troncature une valeur à plusieurs chiffres', async () => {
    const manyListings = Array.from({ length: 12 }, (_, index) =>
      listingDoc(`many-${index}`, {
        ...publicListing.data(),
        title: `Annonce ${index + 1}`,
      }),
    );
    mockListings(manyListings);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByLabelText('12 total annonces')).toBeTruthy();
    expect(within(screen.getByTestId('my-listings-stat-total')).getByText('12')).toBeTruthy();
    expect(await screen.findByText('Annonce 1')).toBeTruthy();
    expect(screen.getByTestId('my-listings-list')).toBeTruthy();
  });

  it('filtre par recherche texte (titre)', async () => {
    mockListings([publicListing, pendingListing]);
    await renderWithProviders(<MyListingsScreen />);

    await screen.findByText('Maison A');
    await fireEvent.changeText(screen.getByTestId('my-listings-search'), 'Studio');

    expect(await screen.findByText('Studio B')).toBeTruthy();
    expect(screen.queryByText('Maison A')).toBeNull();
  });

  it('filtre par état via la modale de filtres', async () => {
    mockListings([publicListing, rejectedListing]);
    await renderWithProviders(<MyListingsScreen />);

    await screen.findByText('Maison A');
    await fireEvent.press(screen.getByTestId('my-listings-filter-button'));
    await fireEvent.press(await screen.findByTestId('my-listings-filter-state-ARCHIVED'));

    expect(await screen.findByText('Terrain C')).toBeTruthy();
    expect(screen.queryByText('Maison A')).toBeNull();
  });

  it("navigue nativement pour une annonce publiquement visible (Voir)", async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-view-p1'));

    expect(mockedNavigate).toHaveBeenCalledWith('Main', {
      screen: 'MainTabs',
      params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: 'p1' } } },
    });
  });

  it("ouvre la fiche web pour une annonce non publique (Voir, PENDING)", async () => {
    mockListings([pendingListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-view-p2'));

    expect(mockedNavigate).not.toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('/property/p2'));
  });

  it('ouvre le formulaire natif de modification pour une annonce immobilière', async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-edit-p1'));
    expect(mockedNavigate).toHaveBeenCalledWith('Main', {
      screen: 'MainTabs',
      params: { screen: 'Publier', params: { screen: 'EditListing', params: { listingId: 'p1' } } },
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('ouvre le formulaire natif de modification pour une annonce Mode', async () => {
    mockListings([marketplaceListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(screen.getByTestId('my-listings-scope-marketplace'));
    await fireEvent.press(await screen.findByTestId('my-listings-edit-p4'));
    expect(mockedNavigate).toHaveBeenCalledWith('Main', {
      screen: 'MainTabs',
      params: { screen: 'Publier', params: { screen: 'EditListing', params: { listingId: 'p4' } } },
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('archive une annonce après confirmation, sans jamais toucher moderationStatus', async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-toggle-p1'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Archiver cette annonce ?',
      'Cette annonce ne sera plus visible dans vos annonces actives.',
      expect.anything(),
    );

    mockListings([{ ...publicListing, data: () => ({ ...publicListing.data(), state: 'ARCHIVED' }) }]);
    await pressAlertButton(alertSpy, 'Archiver');

    await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalled());
    const [, payload] = mockedUpdateDoc.mock.calls[0];
    expect(payload).toMatchObject({ state: 'ARCHIVED' });
    expect(payload).not.toHaveProperty('moderationStatus');
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Annonce mise à jour', 'L’annonce a été archivée.'),
    );
  });

  it("affiche une erreur si l'archivage échoue", async () => {
    mockListings([publicListing]);
    mockedUpdateDoc.mockRejectedValueOnce(new Error('permission-denied'));
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-toggle-p1'));
    await pressAlertButton(alertSpy, 'Archiver');

    expect(await screen.findByText("Impossible de mettre à jour l'état de l'annonce.")).toBeTruthy();
  });

  it('supprime une annonce après confirmation', async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-delete-p1'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Supprimer cette annonce ?',
      'Cette action est définitive. L’annonce sera supprimée de votre compte.',
      expect.anything(),
    );

    mockListings([]);
    await pressAlertButton(alertSpy, 'Supprimer');

    await waitFor(() => expect(mockedDeleteDoc).toHaveBeenCalled());
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Annonce supprimée', 'La suppression a été effectuée avec succès.'),
    );
  });

  it("affiche 'Bientôt disponible' pour Ajouter un réel", async () => {
    mockListings([publicListing]);
    await renderWithProviders(<MyListingsScreen />);

    await fireEvent.press(await screen.findByTestId('my-listings-add-reel-p1'));
    expect(alertSpy).toHaveBeenCalledWith('Bientôt disponible', expect.stringContaining('Ajouter un réel'));
  });

  it('affiche une bannière si la session est indisponible', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockListings([]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Session indisponible. Reconnectez-vous pour gérer vos annonces.')).toBeTruthy();
  });

  it('ne rend plus le bouton persistant "Publier une annonce" au-dessus de la navigation', async () => {
    mockListings([]);
    await renderWithProviders(<MyListingsScreen />);

    expect(await screen.findByText('Aucune annonce trouvée')).toBeTruthy();
    expect(screen.queryByTestId('my-listings-publish')).toBeNull();
    expect(screen.queryByText('Publier une annonce')).toBeNull();
  });
});
