import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import { useNotifications } from '../useNotifications';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Titre',
    message: 'Message',
    type: 'ANNOUNCEMENT',
    isRead: false,
    createdFor: 'uid-1',
    createdAt: { toMillis: () => Date.now() },
    ...overrides,
  };
}

function snapshotFrom(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
}

// PIÈGE RÉSOLU (a fait croire à un deadlock infra pendant un moment) : dans
// @testing-library/react-native 14.x (la version compatible React 19), `renderHook` est une
// fonction ASYNC — elle DOIT être awaitée (`await renderHook(...)`), contrairement aux
// versions précédentes (RNTL 12/13, React 18) où c'était synchrone. Sans le `await`, la
// déstructuration `{ result }` retourne `undefined` silencieusement (aucune erreur immédiate),
// et toute mise à jour d'état doit passer par `await act(async () => {...})` — un `act()`
// synchrone non awaité déclenche un warning React et corrompt le rendu suivant. Enfin, un
// `unmount()` explicite en fin de test déclenche le cleanup du hook (clearInterval +
// unsubscribe), sans quoi Jest n'arrive jamais à quitter le process.
async function renderSubscribed() {
  const rendered = await renderHook(() => useNotifications());
  await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalledTimes(2));
  const [, unreadCallback] = mockedOnSnapshot.mock.calls[0];
  const [, recentCallback] = mockedOnSnapshot.mock.calls[1];
  return { ...rendered, unreadCallback, recentCallback };
}

describe('useNotifications (intégration hook)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it("ne s'abonne à rien sans utilisateur connecté", async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { unmount } = await renderHook(() => useNotifications());
    expect(mockedOnSnapshot).not.toHaveBeenCalled();
    unmount();
  });

  it('fusionne les non-lues et les récentes sans doublon', async () => {
    const { result, unreadCallback, recentCallback, unmount } = await renderSubscribed();

    await act(async () => {
      unreadCallback(snapshotFrom([{ id: 'n1', data: makeNotification({ isRead: false }) }]));
    });
    await act(async () => {
      recentCallback(
        snapshotFrom([
          { id: 'n1', data: makeNotification({ isRead: false }) },
          { id: 'n2', data: makeNotification({ isRead: true }) },
        ]),
      );
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(result.current.unreadCount).toBe(1);
    unmount();
  });

  it("markAsRead met à jour l'état local et persiste isRead:true", async () => {
    const { result, unreadCallback, recentCallback, unmount } = await renderSubscribed();

    await act(async () => {
      unreadCallback(snapshotFrom([{ id: 'n1', data: makeNotification({ isRead: false }) }]));
      recentCallback(snapshotFrom([]));
    });
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { isRead: true });
    unmount();
  });

  it('se désabonne au démontage', async () => {
    const { unmount } = await renderSubscribed();
    const unsubscribeUnread = mockedOnSnapshot.mock.results[0].value;
    const unsubscribeRecent = mockedOnSnapshot.mock.results[1].value;

    await act(async () => {
      unmount();
    });

    expect(unsubscribeUnread).toHaveBeenCalled();
    expect(unsubscribeRecent).toHaveBeenCalled();
  });
});
