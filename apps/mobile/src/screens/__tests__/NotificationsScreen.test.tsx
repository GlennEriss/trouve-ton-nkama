import { screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { render } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot, updateDoc } from '@react-native-firebase/firestore';
import NotificationsScreen from '../NotificationsScreen';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
// NotificationsScreen est un Drawer.Screen de premier niveau (pas sous MainTabs, voir
// DrawerParamList) : il navigue via le navigationRef global, pas useNavigation() local — voir
// la note dans NotificationsScreen.tsx et le même pattern dans usePushNotificationRouting.test.ts.
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn() },
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;
const mockedIsReady = navigationRef.isReady as jest.Mock;
const mockedNavigate = navigationRef.navigate as jest.Mock;

function makeNotif(overrides: Record<string, unknown> = {}) {
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

async function emitNotifications(unread: Array<{ id: string; data: Record<string, unknown> }>, recent: Array<{ id: string; data: Record<string, unknown> }>) {
  await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalledTimes(2));
  const [, unreadCb] = mockedOnSnapshot.mock.calls[0];
  const [, recentCb] = mockedOnSnapshot.mock.calls[1];
  await act(async () => {
    unreadCb({ docs: unread.map((d) => ({ id: d.id, data: () => d.data })) });
    recentCb({ docs: recent.map((d) => ({ id: d.id, data: () => d.data })) });
  });
}

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
    mockedIsReady.mockReturnValue(true);
  });

  it('affiche un message vide sans notification', async () => {
    await render(<NotificationsScreen />);
    await emitNotifications([], []);

    expect(await screen.findByText("Aucune notification pour l'instant.")).toBeTruthy();
  });

  it('marque comme lue et navigue vers ListingDetail au tap si idProperty est présent', async () => {
    await render(<NotificationsScreen />);
    await emitNotifications([{ id: 'n1', data: makeNotif({ isRead: false, idProperty: 'prop-1' }) }], []);

    await fireEvent.press(screen.getByText('Titre'));

    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { isRead: true });
    expect(mockedNavigate).toHaveBeenCalledWith('Main', {
      screen: 'MainTabs',
      params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: 'prop-1' } } },
    });
  });

  it('navigue vers Favoris au tap si actionUrl est /favoris', async () => {
    await render(<NotificationsScreen />);
    await emitNotifications([{ id: 'n1', data: makeNotif({ isRead: false, actionUrl: '/favoris' }) }], []);

    await fireEvent.press(screen.getByText('Titre'));

    expect(mockedNavigate).toHaveBeenCalledWith('Main', { screen: 'Favoris' });
  });

  it('ne navigue nulle part pour une notification sans destination mobile connue', async () => {
    await render(<NotificationsScreen />);
    await emitNotifications([{ id: 'n1', data: makeNotif({ isRead: false, actionUrl: '/gifts' }) }], []);

    await fireEvent.press(screen.getByText('Titre'));

    expect(mockedUpdateDoc).toHaveBeenCalled();
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('"Tout marquer comme lu" ne s\'affiche que s\'il y a des non-lues', async () => {
    await render(<NotificationsScreen />);
    await emitNotifications([], [{ id: 'n1', data: makeNotif({ isRead: true }) }]);

    expect(screen.queryByText('Tout marquer comme lu')).toBeNull();
  });
});
