import {
  publishLinkToPage,
  resolveFacebookPageConfig,
} from '../../src/social/facebook-page.client';

const config = {
  pageId: '1234567890',
  accessToken: 'page-token',
  graphApiVersion: 'v21.0',
};

describe('resolveFacebookPageConfig', () => {
  it('renvoie null tant que la Page n est pas connectée', () => {
    // La fonctionnalité doit rester inerte sans configuration, sans faire échouer la modération.
    expect(resolveFacebookPageConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(resolveFacebookPageConfig({ FACEBOOK_PAGE_ID: '123' } as NodeJS.ProcessEnv)).toBeNull();
    expect(
      resolveFacebookPageConfig({ FACEBOOK_PAGE_ACCESS_TOKEN: 'tok' } as NodeJS.ProcessEnv)
    ).toBeNull();
  });

  it('ignore des valeurs faites uniquement d espaces', () => {
    expect(
      resolveFacebookPageConfig({
        FACEBOOK_PAGE_ID: '   ',
        FACEBOOK_PAGE_ACCESS_TOKEN: 'tok',
      } as NodeJS.ProcessEnv)
    ).toBeNull();
  });

  it('applique une version de Graph API par défaut, surchargeable', () => {
    // Meta retire ses versions par rotation : la surcharge évite un redéploiement de code.
    expect(
      resolveFacebookPageConfig({
        FACEBOOK_PAGE_ID: '123',
        FACEBOOK_PAGE_ACCESS_TOKEN: 'tok',
      } as NodeJS.ProcessEnv)?.graphApiVersion
    ).toBe('v21.0');

    expect(
      resolveFacebookPageConfig({
        FACEBOOK_PAGE_ID: '123',
        FACEBOOK_PAGE_ACCESS_TOKEN: 'tok',
        FACEBOOK_GRAPH_API_VERSION: 'v25.0',
      } as NodeJS.ProcessEnv)?.graphApiVersion
    ).toBe('v25.0');
  });
});

describe('publishLinkToPage', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = fetchMock;
  });

  it('poste sur le feed de la Page et renvoie l identifiant', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '111_222' }) });

    const result = await publishLinkToPage({
      config,
      message: 'Studio meublé',
      link: 'https://www.tonnkama.com/annonce/abc',
    });

    expect(result).toEqual({ success: true, postId: '111_222' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/1234567890/feed');
    expect(JSON.parse(init.body)).toEqual({
      message: 'Studio meublé',
      link: 'https://www.tonnkama.com/annonce/abc',
      access_token: 'page-token',
    });
  });

  it('remonte le message d erreur Meta, seul diagnostic exploitable', async () => {
    // Un jeton expiré ou une permission manquante ne se distinguent que par ce message.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 190, message: 'Error validating access token' } }),
    });

    const result = await publishLinkToPage({ config, message: 'x', link: 'https://x' });

    expect(result).toEqual({
      success: false,
      errorCode: '190',
      errorMessage: 'Error validating access token',
    });
  });

  it('traite une réponse 200 sans identifiant comme un échec', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await publishLinkToPage({ config, message: 'x', link: 'https://x' });

    expect(result).toMatchObject({ success: false });
  });

  it('classe séparément le timeout et la panne réseau', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortError);

    const timedOut = await publishLinkToPage({ config, message: 'x', link: 'https://x', timeoutMs: 5 });
    expect(timedOut).toMatchObject({ success: false, errorCode: 'TIMEOUT' });

    fetchMock.mockRejectedValueOnce(new Error('socket hang up'));
    const networkError = await publishLinkToPage({ config, message: 'x', link: 'https://x' });
    expect(networkError).toMatchObject({ success: false, errorCode: 'NETWORK_ERROR' });
  });
});
