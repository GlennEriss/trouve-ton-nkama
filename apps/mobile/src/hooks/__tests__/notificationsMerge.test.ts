import { mergeNotifications, createdAtToMillis, type AppNotification } from '../useNotifications';

// useNotifications.ts importe @react-native-firebase/{auth,firestore} au niveau module — on ne
// s'en sert pas dans ce fichier (seule la logique de fusion pure est testée ici), mais il faut
// quand même les mocker pour ne jamais charger les vrais modules natifs au require().
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    title: 'Titre',
    message: 'Message',
    type: 'ANNOUNCEMENT',
    isRead: false,
    createdFor: 'uid-1',
    createdAt: { toMillis: () => Date.now() },
    ...overrides,
  };
}

describe('createdAtToMillis', () => {
  it('lit un Timestamp Firestore réel (toMillis)', () => {
    expect(createdAtToMillis({ toMillis: () => 12345 })).toBe(12345);
  });

  it('lit une valeur sérialisée {seconds, nanoseconds}', () => {
    expect(createdAtToMillis({ seconds: 10, nanoseconds: 0 })).toBe(10000);
  });

  it('retourne 0 sans valeur', () => {
    expect(createdAtToMillis(undefined)).toBe(0);
  });
});

// Miroir de mergeNotifications côté web (NotificationProvider.tsx) — la fenêtre "récent" doit
// être recalculée à Date.now() courant, pas figée : c'est exactement le bug qui a été corrigé
// côté web plus tôt cette session (un onglet resté ouvert plusieurs jours voyait sa fenêtre
// "récent" s'élargir indéfiniment au lieu de rester à 7 jours glissants).
describe('mergeNotifications', () => {
  it('fusionne sans doublon (unread prioritaire)', () => {
    const unread = [makeNotification({ id: 'n1', isRead: false })];
    const recent = [makeNotification({ id: 'n1', isRead: false }), makeNotification({ id: 'n2', isRead: true })];

    const result = mergeNotifications(unread, recent);
    expect(result.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('exclut des "récentes" une notification vieille de plus de 7 jours', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const recent = [makeNotification({ id: 'old', isRead: true, createdAt: { toMillis: () => eightDaysAgo } })];

    expect(mergeNotifications([], recent)).toHaveLength(0);
  });

  it('conserve une "récente" vieille de moins de 7 jours', () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    const recent = [makeNotification({ id: 'recent-old', isRead: true, createdAt: { toMillis: () => sixDaysAgo } })];

    expect(mergeNotifications([], recent)).toHaveLength(1);
  });

  it('ne fait jamais expirer une notification non lue, même vieille de plus de 7 jours', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const unread = [makeNotification({ id: 'old-unread', isRead: false, createdAt: { toMillis: () => eightDaysAgo } })];

    const result = mergeNotifications(unread, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('old-unread');
  });

  it("recalcule la fenêtre à l'appel courant plutôt qu'à un instant figé (non-régression)", () => {
    // Une notification à J-6 doit apparaître MAINTENANT ; le même appel refait plus tard avec
    // une horloge avancée de 2 jours (J-8 relatif) doit la faire disparaître — la fenêtre suit
    // Date.now() à chaque appel, elle n'est jamais calculée une seule fois puis réutilisée.
    const realNow = Date.now;
    try {
      const baseTime = realNow();
      const sixDaysBeforeBase = baseTime - 6 * 24 * 60 * 60 * 1000;
      const recent = [makeNotification({ id: 'n1', isRead: true, createdAt: { toMillis: () => sixDaysBeforeBase } })];

      Date.now = () => baseTime;
      expect(mergeNotifications([], recent)).toHaveLength(1);

      Date.now = () => baseTime + 2 * 24 * 60 * 60 * 1000;
      expect(mergeNotifications([], recent)).toHaveLength(0);
    } finally {
      Date.now = realNow;
    }
  });
});
