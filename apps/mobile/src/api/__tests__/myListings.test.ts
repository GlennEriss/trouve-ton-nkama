import { getAuth } from '@react-native-firebase/auth';
import { getDocs, getDoc, where, updateDoc, deleteDoc } from '@react-native-firebase/firestore';
import { getOwnedListing, listMyListings, moderationLabel, setListingState, deleteListing } from '../myListings';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetDocs = getDocs as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedDeleteDoc = deleteDoc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;

describe('getOwnedListing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it('autorise le créateur de l’annonce', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => true, id: 'p1', data: () => ({ createdBy: 'uid-1', title: 'Maison' }) });
    await expect(getOwnedListing('p1')).resolves.toMatchObject({ id: 'p1', title: 'Maison' });
  });

  it('autorise le compte ayant revendiqué l’annonce', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => true, id: 'p2', data: () => ({ createdBy: 'admin', claimedBy: 'uid-1', title: 'Studio' }) });
    await expect(getOwnedListing('p2')).resolves.toMatchObject({ id: 'p2', title: 'Studio' });
  });

  it('refuse un utilisateur qui ne possède pas l’annonce', async () => {
    mockedGetDoc.mockResolvedValue({ exists: () => true, id: 'p3', data: () => ({ createdBy: 'uid-2' }) });
    await expect(getOwnedListing('p3')).rejects.toThrow('pas autorisé');
  });
});

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
