import { renderHook, waitFor, act } from '@testing-library/react-native';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { useAuthState } from '../useAuthState';

jest.mock('@react-native-firebase/auth');

const mockedOnAuthStateChanged = onAuthStateChanged as jest.Mock;

describe('useAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reste en 'initializing' tant que Firebase n'a pas répondu", async () => {
    mockedOnAuthStateChanged.mockImplementation(() => jest.fn()); // ne déclenche jamais le callback
    const { result, unmount } = await renderHook(() => useAuthState());

    expect(result.current.initializing).toBe(true);
    expect(result.current.user).toBeNull();
    unmount();
  });

  it('bascule initializing à false avec user=null quand déconnecté', async () => {
    let capturedCallback: ((user: unknown) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      capturedCallback = cb;
      return jest.fn();
    });
    const { result, unmount } = await renderHook(() => useAuthState());

    await act(async () => {
      capturedCallback?.(null);
    });

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toBeNull();
    unmount();
  });

  it('expose le user une fois authentifié', async () => {
    const fakeUser = { uid: 'uid-1' };
    let capturedCallback: ((user: unknown) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      capturedCallback = cb;
      return jest.fn();
    });
    const { result, unmount } = await renderHook(() => useAuthState());

    await act(async () => {
      capturedCallback?.(fakeUser);
    });

    await waitFor(() => expect(result.current.initializing).toBe(false));
    expect(result.current.user).toEqual(fakeUser);
    unmount();
  });

  it('se désabonne au démontage', async () => {
    const unsubscribe = jest.fn();
    mockedOnAuthStateChanged.mockImplementation(() => unsubscribe);
    const { unmount } = await renderHook(() => useAuthState());

    await act(async () => {
      unmount();
    });

    expect(unsubscribe).toHaveBeenCalled();
  });
});
