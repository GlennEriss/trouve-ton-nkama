import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { parseApiError } from './error';

// Le mobile appelle le MÊME backend Next.js que le web (apps/location-maison/src/app/api/*)
// plutôt que de parler directement à Algolia/Firestore pour tout ce qui n'est pas du temps
// réel — sinon on recrée le problème de coût Algolia déjà corrigé côté web (cache serveur
// contourné par un deuxième client qui tape directement dessus). Voir
// docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.
//
// L'application est exécutée sur le téléphone de l'utilisateur : `localhost` désignerait
// alors le téléphone, et non le serveur Next.js lancé sur le poste du développeur. Le repli
// doit donc toujours être l'API publique. Un développeur qui veut appeler son serveur local
// définit explicitement EXPO_PUBLIC_API_BASE_URL dans son fichier .env.local.
//
// Cette valeur est publique par nature (elle est intégrée au bundle Expo) : n'y placer aucun
// secret. Voir .env.example et les profils EAS dans eas.json.
export const DEFAULT_API_BASE_URL = 'https://www.tonnkama.com';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/** true seulement si l'app mobile a réellement authentifié cet utilisateur (voir la garde
 * isFirebaseConnected ajoutée côté web après la régression trouvée cette même session) —
 * jamais utilisé ici avant que ce token existe réellement. */
async function getAuthHeader(): Promise<Record<string, string>> {
  const currentUser = getAuth().currentUser;
  if (!currentUser) return {};
  const token = await getIdToken(currentUser);
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw parseApiError(response.status, payload);
  }

  return payload as T;
}
