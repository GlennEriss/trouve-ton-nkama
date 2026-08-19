/**
 * Client minimal de la Pages API (Graph) pour publier sur la Page Facebook de la plateforme.
 *
 * Publier sur SA PROPRE Page ne demande pas d'App Review : il suffit que la Page et le compte
 * aient un rôle sur l'app Meta (admin/développeur/testeur). Les permissions utilisées sont
 * `pages_manage_posts` et ses dépendances.
 *
 * Le jeton attendu est un Page Access Token de longue durée, stocké en secret Firebase.
 */

// Meta retire ses versions par rotation (v19 morte en mai 2026, v20 en septembre 2026) : la
// version est configurable pour qu'une montée ne demande pas de redéploiement de code.
const DEFAULT_GRAPH_API_VERSION = 'v21.0';
const DEFAULT_TIMEOUT_MS = 10_000;

export type FacebookPageConfig = {
  pageId: string;
  accessToken: string;
  graphApiVersion: string;
};

export type PublishToPageResult =
  | { success: true; postId: string }
  | { success: false; errorCode: string; errorMessage: string };

/**
 * Renvoie `null` quand la configuration est absente. L'appelant traite ce cas comme un no-op
 * silencieux — même parti pris que /api/meta/capi, qui ne fait rien tant que le pixel et le
 * jeton ne sont pas définis. La fonctionnalité reste ainsi inerte tant que la Page n'est pas
 * connectée, sans planter la modération.
 */
export function resolveFacebookPageConfig(env: NodeJS.ProcessEnv = process.env): FacebookPageConfig | null {
  const pageId = env.FACEBOOK_PAGE_ID?.trim();
  const accessToken = env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();

  if (!pageId || !accessToken) {
    return null;
  }

  return {
    pageId,
    accessToken,
    graphApiVersion: env.FACEBOOK_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION,
  };
}

export async function publishLinkToPage(input: {
  config: FacebookPageConfig;
  message: string;
  link: string;
  timeoutMs?: number;
}): Promise<PublishToPageResult> {
  const { config, message, link } = input;
  const url = `https://graph.facebook.com/${config.graphApiVersion}/${config.pageId}/feed`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message,
        link,
        access_token: config.accessToken,
      }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; error?: { code?: number; message?: string; type?: string } }
      | null;

    if (!response.ok || payload?.error || !payload?.id) {
      return {
        success: false,
        errorCode: String(payload?.error?.code ?? response.status),
        // Le message d'erreur Meta est la seule information exploitable pour diagnostiquer un
        // jeton expiré ou une permission manquante : on le conserve tel quel dans les logs.
        errorMessage: payload?.error?.message ?? `HTTP ${response.status}`,
      };
    }

    return { success: true, postId: payload.id };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }
}
