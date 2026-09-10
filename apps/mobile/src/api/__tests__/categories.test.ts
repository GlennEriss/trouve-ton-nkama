import { getAuth } from '@react-native-firebase/auth';
import { getActiveCategories, getPublishableLeaves } from '../categories';

jest.mock('@react-native-firebase/auth');

describe('getActiveCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  });

  it('appelle /api/categories/active et retourne la liste', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ categories: [{ id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 }] }),
    });

    const result = await getActiveCategories();

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/categories/active');
    expect(result).toEqual([{ id: 'immobilier', slug: 'immobilier', name: 'Immobilier', icon: null, order: 0 }]);
  });

  it("retourne un tableau vide si le champ 'categories' est absent", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    expect(await getActiveCategories()).toEqual([]);
  });
});

describe('getPublishableLeaves', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
  });

  it('appelle /api/categories/publishable-leaves et retourne les feuilles', async () => {
    const leaves = [
      {
        id: 'chaussures',
        slug: 'chaussures',
        name: 'Chaussures',
        rootId: 'mode',
        rootName: 'Mode',
        locationPrecision: 'city',
        attributeSchema: [
          { key: 'pointure', label: 'Pointure', type: 'enum', options: ['40', '41'], required: true, facetable: true, primary: true },
        ],
      },
    ];
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ leaves }) });

    const result = await getPublishableLeaves();

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/categories/publishable-leaves');
    expect(result).toEqual(leaves);
  });

  it("retourne un tableau vide si le champ 'leaves' est absent", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    expect(await getPublishableLeaves()).toEqual([]);
  });
});
