import { getAuth } from '@react-native-firebase/auth';
import { getPropertyById } from '../property';

jest.mock('@react-native-firebase/auth');

describe('getPropertyById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'prop-1', title: 'Belle maison' }),
    });
  });

  it("appelle /api/property/id avec l'id encodé en query param", async () => {
    await getPropertyById('prop 1/étrange');

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/property/id?id=');
    expect(url).toContain(encodeURIComponent('prop 1/étrange'));
  });

  it('retourne le détail de la propriété', async () => {
    const result = await getPropertyById('prop-1');
    expect(result).toEqual({ id: 'prop-1', title: 'Belle maison' });
  });
});
