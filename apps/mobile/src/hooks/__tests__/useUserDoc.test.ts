import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot } from '@react-native-firebase/firestore';
import { useUserDoc } from '../useUserDoc';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;

describe('useUserDoc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it('reste null sans utilisateur connecté', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { result, unmount } = await renderHook(() => useUserDoc());

    expect(result.current.userDoc).toBeNull();
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it('expose les champs du document utilisateur', async () => {
    const { result, unmount } = await renderHook(() => useUserDoc());
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];

    await act(async () => {
      onNext({ data: () => ({ firstname: 'Jean', lastname: 'Mba', phoneNumberVerified: true }) });
    });

    expect(result.current.userDoc).toEqual({ firstname: 'Jean', lastname: 'Mba', phoneNumberVerified: true });
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it("passe isLoading à false même en cas d'erreur de permission", async () => {
    const { result, unmount } = await renderHook(() => useUserDoc());
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, , onError] = mockedOnSnapshot.mock.calls[0];

    await act(async () => {
      onError({ code: 'permission-denied' });
    });

    expect(result.current.isLoading).toBe(false);
    unmount();
  });
});
