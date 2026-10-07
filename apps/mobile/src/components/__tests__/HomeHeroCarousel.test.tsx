import React from 'react';
import { AccessibilityInfo, Dimensions, Linking, type EmitterSubscription } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { HomeHeroCarousel } from '../HomeHeroCarousel';
import { trackAdEvent, type AdCreative } from '../../api/advertising';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../api/advertising', () => ({
  getActiveHomeAds: jest.fn(),
  trackAdEvent: jest.fn(),
}));
jest.mock('../Logo', () => ({ Logo: () => null }));

const mockedUseQuery = useQuery as jest.Mock;
const creative = (id: string): AdCreative => ({
  campaignId: id,
  placement: 'home',
  imageURL: `https://example.test/${id}.png`,
  headline: `Campagne ${id}`,
  ctaUrl: 'https://example.test/cta',
});

describe('HomeHeroCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as unknown as EmitterSubscription);
  });

  afterEach(() => jest.restoreAllMocks());

  it('affiche seulement la slide plateforme et aucune pagination sans publicité', async () => {
    mockedUseQuery.mockReturnValue({ data: [] });
    await render(<HomeHeroCarousel />);
    expect(screen.getByTestId('home-hero-platform-slide')).toBeTruthy();
    expect(screen.queryByTestId('home-hero-position-indicator')).toBeNull();
  });

  it('affiche une publicité entière en contain et une pagination compacte intégrée', async () => {
    mockedUseQuery.mockReturnValue({ data: [creative('one')] });
    await render(<HomeHeroCarousel />);
    expect(screen.getByTestId('home-hero-sponsored-one')).toBeTruthy();
    expect(screen.getByTestId('home-hero-sponsored-image').props.resizeMode).toBe('contain');
    expect(screen.getByTestId('home-hero-position-indicator')).toHaveTextContent('1 / 2');
  });

  it('met à jour la position après un swipe avec plusieurs publicités', async () => {
    mockedUseQuery.mockReturnValue({ data: [creative('one'), creative('two')] });
    await render(<HomeHeroCarousel />);
    await act(async () => fireEvent(screen.getByTestId('home-hero-carousel'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: Dimensions.get('window').width } } }));
    expect(screen.getByTestId('home-hero-position-indicator')).toHaveTextContent('2 / 3');
    expect(trackAdEvent).toHaveBeenCalledWith('impression', 'one', 'home-hero');
  });

  it('ouvre le CTA et suit le clic', async () => {
    mockedUseQuery.mockReturnValue({ data: [creative('one')] });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<HomeHeroCarousel />);
    fireEvent.press(screen.getByTestId('home-hero-sponsored-one'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://example.test/cta'));
    expect(trackAdEvent).toHaveBeenCalledWith('click', 'one', 'home-hero');
  });

  it('affiche le fallback existant lorsque le visuel ne charge pas', async () => {
    mockedUseQuery.mockReturnValue({ data: [creative('broken')] });
    await render(<HomeHeroCarousel />);
    await act(async () => fireEvent(screen.getByTestId('home-hero-sponsored-image'), 'error'));
    expect(screen.getByTestId('home-hero-sponsored-fallback')).toBeTruthy();
  });

  it('fait avancer automatiquement le carousel puis nettoie son timer', async () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    mockedUseQuery.mockReturnValue({ data: [creative('one')] });
    const view = await render(<HomeHeroCarousel />);
    await act(async () => jest.advanceTimersByTime(7000));
    expect(screen.getByTestId('home-hero-position-indicator')).toHaveTextContent('2 / 2');
    await view.unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
