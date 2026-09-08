import { renderHook, act } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getMessaging, requestPermission, getToken, onTokenRefresh, AuthorizationStatus } from '@react-native-firebase/messaging';
import { updateDoc } from '@react-native-firebase/firestore';
import { useFcmToken } from '../useFcmToken';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/messaging');

const mockedGetAuth = getAuth as jest.Mock;
const mockedRequestPermission = requestPermission as jest.Mock;
const mockedGetToken = getToken as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

describe('useFcmToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it('enregistre le token si la permission est accordée', async () => {
    mockedRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockedGetToken.mockResolvedValue('token-abc');

    const { unmount } = await renderHook(() => useFcmToken());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { fcmTokens: expect.anything() });
    unmount();
  });

  it("n'enregistre rien si la permission est refusée", async () => {
    mockedRequestPermission.mockResolvedValue(AuthorizationStatus.DENIED);

    const { unmount } = await renderHook(() => useFcmToken());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedGetToken).not.toHaveBeenCalled();
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
    unmount();
  });

  it('accepte aussi la permission provisoire (iOS)', async () => {
    mockedRequestPermission.mockResolvedValue(AuthorizationStatus.PROVISIONAL);
    mockedGetToken.mockResolvedValue('token-provisional');

    const { unmount } = await renderHook(() => useFcmToken());
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedUpdateDoc).toHaveBeenCalled();
    unmount();
  });

  it("ne fait rien sans utilisateur connecté", async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { unmount } = await renderHook(() => useFcmToken());

    expect(mockedRequestPermission).not.toHaveBeenCalled();
    unmount();
  });

  it('met à jour le token sur onTokenRefresh', async () => {
    mockedRequestPermission.mockResolvedValue(AuthorizationStatus.AUTHORIZED);
    mockedGetToken.mockResolvedValue('token-abc');
    let refreshCallback: ((token: string) => void) | undefined;
    (onTokenRefresh as jest.Mock).mockImplementation((_messaging, cb) => {
      refreshCallback = cb;
      return jest.fn();
    });

    const { unmount } = await renderHook(() => useFcmToken());
    await act(async () => {
      await Promise.resolve();
    });
    mockedUpdateDoc.mockClear();

    await act(async () => {
      refreshCallback?.('token-refreshed');
    });

    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { fcmTokens: expect.anything() });
    unmount();
  });
});
