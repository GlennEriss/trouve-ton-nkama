import { renderHook, act } from '@testing-library/react-native';
import { getInitialNotification, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import { usePushNotificationRouting } from '../usePushNotificationRouting';
import { navigationRef } from '../../navigation/navigationRef';

jest.mock('@react-native-firebase/messaging');
jest.mock('../../navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(), navigate: jest.fn() },
}));

const mockedGetInitialNotification = getInitialNotification as jest.Mock;
const mockedOnNotificationOpenedApp = onNotificationOpenedApp as jest.Mock;
const mockedIsReady = navigationRef.isReady as jest.Mock;
const mockedNavigate = navigationRef.navigate as jest.Mock;

describe('usePushNotificationRouting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsReady.mockReturnValue(true);
    mockedGetInitialNotification.mockResolvedValue(null);
    mockedOnNotificationOpenedApp.mockReturnValue(jest.fn());
  });

  it('navigue vers ListingDetail si getInitialNotification renvoie une annonce (app relancée depuis un tap)', async () => {
    mockedGetInitialNotification.mockResolvedValue({ data: { actionUrl: '/houseDetails/prop-1' } });

    await renderHook(() => usePushNotificationRouting());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedNavigate).toHaveBeenCalledWith('Main', {
      screen: 'MainTabs',
      params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: 'prop-1' } } },
    });
  });

  it("n'appelle pas navigate quand getInitialNotification est null (lancement normal)", async () => {
    await renderHook(() => usePushNotificationRouting());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it('navigue au tap sur une notification alors que l\'app est en arrière-plan', async () => {
    let openedCallback: ((message: unknown) => void) | undefined;
    mockedOnNotificationOpenedApp.mockImplementation((_messaging, cb) => {
      openedCallback = cb;
      return jest.fn();
    });

    await renderHook(() => usePushNotificationRouting());
    await act(async () => {
      openedCallback?.({ data: { actionUrl: '/favoris' } });
    });

    expect(mockedNavigate).toHaveBeenCalledWith('Main', { screen: 'Favoris' });
  });

  it('ignore la navigation si le navigationContainer n\'est pas encore prêt', async () => {
    mockedIsReady.mockReturnValue(false);
    mockedGetInitialNotification.mockResolvedValue({ data: { actionUrl: '/houseDetails/prop-1' } });

    await renderHook(() => usePushNotificationRouting());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
