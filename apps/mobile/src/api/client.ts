import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { parseApiError } from './error';

// Le mobile appelle le MÊME backend Next.js que le web (apps/location-maison/src/app/api/*)
// plutôt que de parler directement à Algolia/Firestore pour tout ce qui n'est pas du temps
// réel — sinon on recrée le problème de coût Algolia déjà corrigé côté web (cache serveur
// contourné par un deuxième client qui tape directement dessus). Voir
// docs/location-maison/troubleshooting/ALGOLIA-COST-AUDIT-2026-09.md.
//
// En dev, le simulateur iOS tourne sur la même machine que `npm run dev` : localhost
// fonctionne tel quel (contrairement à un appareil Android physique, qui aurait besoin de
// l'IP réseau de la machine). À reconfigurer par profil de build (eas.json) une fois la
// mise en prod des environnements dev/preprod/prod abordée.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

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
