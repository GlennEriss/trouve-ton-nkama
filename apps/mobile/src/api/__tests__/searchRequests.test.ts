import { getAuth } from '@react-native-firebase/auth';
import { getDocs, where, orderBy, limit } from '@react-native-firebase/firestore';
import { listSearchRequests, createSearchRequest } from '../searchRequests';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetDocs = getDocs as jest.Mock;

describe('listSearchRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filtre sur state IN_PROGRESS et moderationStatus APPROVED (lecture publique)', async () => {
    mockedGetDocs.mockResolvedValue({ docs: [] });
    await listSearchRequests();

    expect(where).toHaveBeenCalledWith('state', '==', 'IN_PROGRESS');
    expect(where).toHaveBeenCalledWith('moderationStatus', '==', 'APPROVED');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limit).toHaveBeenCalledWith(50);
  });

  it('mappe les documents avec leur id', async () => {
    mockedGetDocs.mockResolvedValue({
      docs: [{ id: 'sr-1', data: () => ({ city: 'Libreville', typeProperty: 'Home' }) }],
    });

    const result = await listSearchRequests();
    expect(result).toEqual([{ id: 'sr-1', city: 'Libreville', typeProperty: 'Home' }]);
  });
});

describe('createSearchRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  });

  it('poste vers /api/search-requests/mobile-create (gratuit, authentifié)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, id: 'sr-new' }),
    });

    const input = {
      typeProperty: 'Home',
      transactionType: 'FOR_RENT' as const,
      province: 'Estuaire',
      city: 'Libreville',
      budgetMinXaf: 0,
      budgetMaxXaf: 150000,
      description: 'Recherche...',
      whatsappContact: '074123456',
    };
    const result = await createSearchRequest(input);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/search-requests/mobile-create');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(result).toEqual({ success: true, id: 'sr-new' });
  });
});
