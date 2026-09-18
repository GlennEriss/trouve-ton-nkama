import { getAuth } from '@react-native-firebase/auth';
import { getDocs, where, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import { listMyListings, moderationLabel, setListingState, deleteListing } from '../myListings';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetDocs = getDocs as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedDeleteDoc = deleteDoc as jest.Mock;

describe('moderationLabel', () => {
  it('traduit chaque statut de modération (miroir MODERATION_STATUS_LABELS, web)', () => {
    expect(moderationLabel('APPROVED')).toBe('Publiée');
    expect(moderationLabel('REJECTED')).toBe('Rejetée');
    expect(moderationLabel('PENDING')).toBe('En attente de validation');
  });
});

describe('setListingState', () => {
  it("n'envoie jamais moderationStatus dans la patch (règle Firestore : doit rester inchangé)", async () => {
    await setListingState('p1', 'ARCHIVED');
    const [, payload] = mockedUpdateDoc.mock.calls[0];
    expect(payload).not.toHaveProperty('moderationStatus');
    expect(payload).toMatchObject({ state: 'ARCHIVED' });
  });
});

describe('deleteListing', () => {
  it('supprime le document properties/{id}', async () => {
    await deleteListing('p1');
    expect(mockedDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'properties/p1' }));
  });
});

describe('listMyListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renvoie une liste vide sans utilisateur connecté', async () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
    const result = await listMyListings();
    expect(result).toEqual([]);
    expect(mockedGetDocs).not.toHaveBeenCalled();
  });

  it('interroge createdBy ET claimedBy pour le même uid', async () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedGetDocs.mockResolvedValue({ docs: [] });

    await listMyListings();

    expect(where).toHaveBeenCalledWith('createdBy', '==', 'uid-1');
    expect(where).toHaveBeenCalledWith('claimedBy', '==', 'uid-1');
  });

  it('fusionne les résultats sans doublon (une annonce créée ET revendiquée par le même uid)', async () => {
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'uid-1' } });
    const listingDoc = { id: 'p1', data: () => ({ title: 'Maison A', price: 100000 }) };
    mockedGetDocs
      .mockResolvedValueOnce({ docs: [listingDoc] }) // createdBy
      .mockResolvedValueOnce({ docs: [listingDoc] }); // claimedBy (même annonce)

    const result = await listMyListings();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 'p1', title: 'Maison A', price: 100000 });
  });
});
