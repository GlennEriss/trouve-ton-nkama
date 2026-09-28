import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ReelsScreen from '../ReelsScreen';

const mockNavigate = jest.fn();
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();
const mockTrackView = jest.fn<Promise<void>, [string]>(() => Promise.resolve());
const mockTrackLike = jest.fn<Promise<void>, [string, boolean]>(() => Promise.resolve());

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../api/reels', () => ({
  listPublicReels: jest.fn(),
  trackReelView: (reelId: string) => mockTrackView(reelId),
  trackReelLike: (reelId: string, liked: boolean) => mockTrackLike(reelId, liked),
  trackReelShare: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../api/property', () => ({ getPropertyById: jest.fn() }));
jest.mock('../../api/categories', () => ({ getActiveCategories: jest.fn() }));
jest.mock('@react-native-firebase/firestore', () => ({ getFirestore: jest.fn(), doc: jest.fn(), getDoc: jest.fn() }));

let mockFeedState: Record<string, unknown>;
jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: () => mockFeedState,
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'categories') return { data: [{ id: '1', name: 'Immobilier' }, { id: '2', name: 'Mode' }] };
    if (queryKey[0] === 'property') return { data: { title: 'Studio moderne', price: 110000, city: 'Libreville', contact: '24106000000' } };
    return { data: { pseudo: 'Nkama Immo' } };
  },
}));

const reel = { id: 'reel-1', createdBy: 'user-1', propertyId: 'property-1', description: 'Visitez ce logement lumineux', videoUrl: 'https://example.com/reel.mp4', likeCount: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  mockFeedState = { data: { pages: [{ reels: [reel], nextCursor: null }] }, isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: mockFetchNextPage, refetch: mockRefetch };
});

it('affiche le réel, les informations PWA et enregistre la vue', async () => {
  await render(<ReelsScreen />);
  await fireEvent(screen.getByTestId('screen-reels'), 'layout', { nativeEvent: { layout: { height: 640 } } });

  expect(screen.getByText('Visitez ce logement lumineux')).toBeTruthy();
  expect(screen.getByText('Studio moderne')).toBeTruthy();
  expect(screen.getByText(/110[\s\u202f]000 FCFA/)).toBeTruthy();
  expect(screen.getByLabelText("J'aime ce réel")).toBeTruthy();
  expect(screen.getByLabelText('Contacter via WhatsApp')).toBeTruthy();
  expect(mockTrackView).toHaveBeenCalledWith('reel-1');
});

it('met à jour le like de façon optimiste', async () => {
  await render(<ReelsScreen />);
  await fireEvent(screen.getByTestId('screen-reels'), 'layout', { nativeEvent: { layout: { height: 640 } } });
  await fireEvent.press(screen.getByLabelText("J'aime ce réel"));
  expect(mockTrackLike).toHaveBeenCalledWith('reel-1', true);
  expect(screen.getByLabelText("Retirer le j'aime")).toBeTruthy();
});

it('affiche un état de reprise en cas d’erreur réseau', async () => {
  mockFeedState = { isLoading: false, isError: true, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: mockFetchNextPage, refetch: mockRefetch };
  await render(<ReelsScreen />);
  expect(screen.getByText('Impossible de charger les réels')).toBeTruthy();
  await fireEvent.press(screen.getByText('Réessayer'));
  expect(mockRefetch).toHaveBeenCalled();
});
