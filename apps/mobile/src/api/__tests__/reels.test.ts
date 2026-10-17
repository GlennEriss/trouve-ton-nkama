import { getAuth } from '@react-native-firebase/auth';
import { buildMobileRawReelVideoPath } from '../reels';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/storage', () => ({
  getStorage: jest.fn(),
  putFile: jest.fn(),
  ref: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.Mock;

describe('API mobile des réels', () => {
  it('construit le chemin brut avec le UID Firebase complet exigé par le backend', () => {
    mockedGetAuth.mockReturnValue({ currentUser: { uid: 'firebase-uid-complet-123' } });
    expect(buildMobileRawReelVideoPath('reel-42', 'visite.MOV')).toBe(
      'reels-raw/firebase-uid-complet-123/reel-42.mov',
    );
  });

  it('refuse de construire un chemin sans session Firebase', () => {
    mockedGetAuth.mockReturnValue({ currentUser: null });
    expect(() => buildMobileRawReelVideoPath('reel-42', 'visite.mp4')).toThrow('Session Firebase introuvable');
  });
});
