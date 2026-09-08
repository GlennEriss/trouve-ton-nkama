import { renderHook, act, waitFor } from '@testing-library/react-native';
import { getAuth } from '@react-native-firebase/auth';
import { onSnapshot, updateDoc, arrayUnion, arrayRemove } from '@react-native-firebase/firestore';
import { useFavoriteIds, addFavorite, removeFavorite } from '../useFavoriteIds';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');

const mockedGetAuth = getAuth as jest.Mock;
const mockedOnSnapshot = onSnapshot as jest.Mock;
const mockedUpdateDoc = updateDoc as jest.Mock;

describe('useFavoriteIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it('renvoie une liste vide sans utilisateur connecté', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    const { result, unmount } = await renderHook(() => useFavoriteIds());

    expect(result.current.favoriteIds).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it('lit le tableau favoris du document utilisateur', async () => {
    const { result, unmount } = await renderHook(() => useFavoriteIds());
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];

    await act(async () => {
      onNext({ data: () => ({ favoris: ['p1', 'p2'] }) });
    });

    expect(result.current.favoriteIds).toEqual(['p1', 'p2']);
    expect(result.current.isLoading).toBe(false);
    unmount();
  });

  it('traite un document sans champ favoris comme une liste vide', async () => {
    const { result, unmount } = await renderHook(() => useFavoriteIds());
    await waitFor(() => expect(mockedOnSnapshot).toHaveBeenCalled());
    const [, onNext] = mockedOnSnapshot.mock.calls[0];

    await act(async () => {
      onNext({ data: () => undefined });
    });

    expect(result.current.favoriteIds).toEqual([]);
    unmount();
  });
});

describe('addFavorite / removeFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  });

  it('addFavorite utilise arrayUnion', async () => {
    await addFavorite('p1');
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { favoris: (arrayUnion as jest.Mock).mock.results[0].value });
  });

  it('removeFavorite utilise arrayRemove', async () => {
    await removeFavorite('p1');
    expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.anything(), { favoris: (arrayRemove as jest.Mock).mock.results[0].value });
  });

  it('ne fait rien sans utilisateur connecté', async () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    await addFavorite('p1');
    expect(mockedUpdateDoc).not.toHaveBeenCalled();
  });
});
