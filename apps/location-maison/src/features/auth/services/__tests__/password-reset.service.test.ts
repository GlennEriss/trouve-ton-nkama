/**
 * Bascule d'envoi (2026-08-25) : NEXT_PUBLIC_EMAIL_PROVIDER=firebase_default doit envoyer via
 * sendPasswordResetEmail (SDK client) au lieu de notre API /api/auth/send-password-reset-email,
 * sans toucher au flux de confirmation (oobCode) déjà en place. Voir email-provider-client.ts.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PasswordResetRequestErrorCode } from '../password-reset.service.interface';

jest.mock('@/firebase/auth', () => ({
  auth: {},
  sendPasswordResetEmail: jest.fn(),
}));

global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('PasswordResetServiceImpl.requestPasswordReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_EMAIL_PROVIDER;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EMAIL_PROVIDER;
  });

  it('utilise toujours notre API par défaut (NEXT_PUBLIC_EMAIL_PROVIDER non défini)', async () => {
    const { passwordResetService } = await import('../password-reset.service');
    const { sendPasswordResetEmail } = await import('@/firebase/auth');
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await passwordResetService.requestPasswordReset('user@example.com');

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/send-password-reset-email',
      expect.anything(),
    );
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('envoie via sendPasswordResetEmail quand NEXT_PUBLIC_EMAIL_PROVIDER=firebase_default', async () => {
    process.env.NEXT_PUBLIC_EMAIL_PROVIDER = 'firebase_default';
    const { passwordResetService } = await import('../password-reset.service');
    const { sendPasswordResetEmail } = await import('@/firebase/auth');
    (sendPasswordResetEmail as any).mockResolvedValue(undefined);

    const result = await passwordResetService.requestPasswordReset('user@example.com');

    expect(result.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      {},
      'user@example.com',
      expect.objectContaining({ handleCodeInApp: true }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('remonte USER_NOT_FOUND quand Firebase rejette avec auth/user-not-found', async () => {
    process.env.NEXT_PUBLIC_EMAIL_PROVIDER = 'firebase_default';
    const { passwordResetService } = await import('../password-reset.service');
    const { sendPasswordResetEmail } = await import('@/firebase/auth');
    (sendPasswordResetEmail as any).mockRejectedValue(
      Object.assign(new Error('no user'), { code: 'auth/user-not-found' }),
    );

    const result = await passwordResetService.requestPasswordReset('inconnu@example.com');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(PasswordResetRequestErrorCode.USER_NOT_FOUND);
  });
});
