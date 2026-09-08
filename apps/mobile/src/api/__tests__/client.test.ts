import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { apiFetch } from '../client';
import { ApiError } from '../error';

jest.mock('@react-native-firebase/auth');

const mockedGetAuth = getAuth as jest.Mock;
const mockedGetIdToken = getIdToken as jest.Mock;

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("n'attache aucun header Authorization sans utilisateur connecté", async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockFetchOnce(200, { success: true });

    await apiFetch('/api/test');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('attache le token Firebase en Bearer quand connecté', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedGetIdToken.mockResolvedValue('id-token-abc');
    mockFetchOnce(200, { success: true });

    await apiFetch('/api/test');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer id-token-abc');
  });

  it('sérialise le body en JSON quand fourni', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockFetchOnce(200, { success: true });

    await apiFetch('/api/test', { method: 'POST', body: { foo: 'bar' } });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.body).toBe(JSON.stringify({ foo: 'bar' }));
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('lève une ApiError sur une réponse non-ok', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockFetchOnce(404, { success: false, error: { code: 'NOT_FOUND', message: 'Introuvable.' } });

    await expect(apiFetch('/api/test')).rejects.toMatchObject(
      expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
    );
  });

  it('l\'erreur levée est bien une instance de ApiError', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockFetchOnce(404, { success: false, error: { code: 'NOT_FOUND', message: 'Introuvable.' } });

    await expect(apiFetch('/api/test')).rejects.toBeInstanceOf(ApiError);
  });

  it('retourne le payload JSON tel quel sur succès', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    mockFetchOnce(200, { success: true, id: 'abc' });

    const result = await apiFetch('/api/test');
    expect(result).toEqual({ success: true, id: 'abc' });
  });
});
