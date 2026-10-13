import { screen, waitFor, fireEvent } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import ListingDetailScreen from '../ListingDetailScreen';
import { getOwnedListing } from '../../api/myListings';
import { getPublicUserSummary } from '../../api/users';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('../../api/myListings', () => ({
  getOwnedListing: jest.fn(),
  moderationLabel: (status: string) => status === 'APPROVED' ? 'Publiée' : status === 'REJECTED' ? 'Rejetée' : 'En attente de validation',
}));
jest.mock('../../api/users', () => ({ getPublicUserSummary: jest.fn() }));

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;

const Stack = createNativeStackNavigator();

function renderScreen(objectID = 'prop-1', ownerView = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="ListingDetail" component={ListingDetailScreen} initialParams={{ objectID, ownerView }} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

describe('ListingDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    (getPublicUserSummary as jest.Mock).mockResolvedValue({ pseudo: 'Maison Estelle' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'prop-1', createdBy: 'owner-1',
        title: 'Belle maison',
        description: 'Superbe.',
        price: 150000,
        area: 80,
        typeProperty: 'Home',
        status: 'FOR_RENT',
        city: 'Libreville',
        province: 'Estuaire',
        whatsappContact: '074123456',
        images: [],
      }),
    });
  });

  it("affiche l'identité de l'annonceur comme la fiche PWA", async () => {
    await renderScreen();
    expect(await screen.findByText('Maison Estelle')).toBeTruthy();
    expect(getPublicUserSummary).toHaveBeenCalledWith('owner-1');
  });

  it("ouvre WhatsApp avec le contact normalisé au clic", async () => {
    await renderScreen();
    expect(await screen.findByText('Belle maison')).toBeTruthy();

    await fireEvent.press(screen.getByText('WhatsApp'));

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/24174123456'));
  });

  it("bascule callContact -> contact en repli si whatsappContact est absent (pas de bouton WhatsApp)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'prop-1',
        title: 'Belle maison',
        description: 'Superbe.',
        price: 150000,
        typeProperty: 'Home',
        status: 'FOR_RENT',
        city: 'Libreville',
        province: 'Estuaire',
        contact: '074999999',
        images: [],
      }),
    });
    await renderScreen();
    expect(await screen.findByText('Belle maison')).toBeTruthy();

    await fireEvent.press(screen.getByText('WhatsApp'));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('wa.me/24174999999'));
  });

  it('affiche un message si l\'annonce est introuvable', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({ success: false }) });
    await renderScreen();

    expect(await screen.findByText('Annonce inaccessible')).toBeTruthy();
  });

  it('affiche une annonce propriétaire archivée et rejetée sans la rendre publique', async () => {
    (getOwnedListing as jest.Mock).mockResolvedValue({
      id: 'prop-owner', createdBy: 'uid-1', title: 'Robe refusée', description: 'Une robe.',
      price: 14000, categoryId: 'mode', categoryPath: { lvl0: 'Mode', lvl1: 'Mode > Robes' },
      attributes: { taille: 'L', couleur: 'Noir' }, moderationStatus: 'REJECTED',
      rejectionReason: 'Photo insuffisante', state: 'ARCHIVED', city: 'Libreville', images: [],
    });
    await renderScreen('prop-owner', true);
    expect(await screen.findByTestId('owner-listing-detail')).toBeTruthy();
    expect(screen.getByText('Robe refusée')).toBeTruthy();
    expect(screen.getByText('Motif du rejet : Photo insuffisante')).toBeTruthy();
    expect(screen.getByText('Cette annonce est actuellement archivée.')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuse une fiche propriétaire non autorisée', async () => {
    (getOwnedListing as jest.Mock).mockRejectedValue(new Error("Vous n’êtes pas autorisé à consulter cette annonce."));
    await renderScreen('forbidden', true);
    expect(await screen.findByText("Vous n’êtes pas autorisé à consulter cette annonce.")).toBeTruthy();
  });

  it('ajoute et retire des favoris au tap sur le cœur', async () => {
    const { updateDoc, arrayUnion } = jest.requireMock('@react-native-firebase/firestore');
    let favSnapshotCallback: ((snap: unknown) => void) | undefined;
    mockedOnSnapshot.mockImplementation((_ref, cb) => {
      favSnapshotCallback = cb;
      return jest.fn();
    });

    await renderScreen();
    expect(await screen.findByText('Belle maison')).toBeTruthy();
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    await fireEvent.press(screen.getByLabelText('Ajouter aux favoris'));

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { favoris: expect.anything() });
    expect(arrayUnion).toHaveBeenCalledWith('prop-1');
    void favSnapshotCallback;
  });
});
