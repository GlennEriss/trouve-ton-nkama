import { signout } from '@/actions/signout';

jest.mock('@/firebase/auth', () => ({
  auth: {},
  signOut: jest.fn(),
}));

jest.mock('@/next-auth/auth', () => ({
  signOut: jest.fn(),
}));

describe('signout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign out from Firebase and NextAuth successfully', async () => {
    const firebaseMock = await import('@/firebase/auth');
    const nextAuthMock = await import('@/next-auth/auth');

    (firebaseMock.signOut as jest.Mock).mockResolvedValueOnce(undefined);
    (nextAuthMock.signOut as jest.Mock).mockResolvedValueOnce(undefined);

    const result = await signout();
    expect(firebaseMock.signOut).toHaveBeenCalled();
    expect(nextAuthMock.signOut).toHaveBeenCalledWith({ redirect: false });
    expect(result).toBe(true);
  });

  it('should return false if Firebase signOut fails', async () => {
    const firebaseMock = await import('@/firebase/auth');
    const nextAuthMock = await import('@/next-auth/auth');

    (firebaseMock.signOut as jest.Mock).mockRejectedValueOnce(new Error('Firebase error'));

    const result = await signout();
    expect(firebaseMock.signOut).toHaveBeenCalled();
    expect(nextAuthMock.signOut).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('should return false if NextAuth signOut fails', async () => {
    const firebaseMock = await import('@/firebase/auth');
    const nextAuthMock = await import('@/next-auth/auth');

    (firebaseMock.signOut as jest.Mock).mockResolvedValueOnce(undefined);
    (nextAuthMock.signOut as jest.Mock).mockRejectedValueOnce(new Error('NextAuth error'));

    const result = await signout();
    expect(firebaseMock.signOut).toHaveBeenCalled();
    expect(nextAuthMock.signOut).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
