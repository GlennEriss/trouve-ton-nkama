import React from 'react';
import { View } from 'react-native';

export const mockVideoPlayer = {
  loop: false,
  muted: true,
  currentTime: 0,
  play: jest.fn(),
  pause: jest.fn(),
};

export function useVideoPlayer(_source: unknown, setup?: (player: typeof mockVideoPlayer) => void) {
  setup?.(mockVideoPlayer);
  return mockVideoPlayer;
}

export function VideoView(props: Record<string, unknown>) {
  return <View testID="video-view" {...props} />;
}
