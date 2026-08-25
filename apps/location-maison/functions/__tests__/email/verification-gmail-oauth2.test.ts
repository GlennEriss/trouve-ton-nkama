/**
 * Bascule de provider (2026-08-25) : EMAIL_PROVIDER=gmail_oauth2 doit envoyer via Gmail OAuth2
 * au lieu de Hostinger, avec le bon expéditeur. Fichier séparé du reste des tests unitaires
 * pour éviter le cache interne des secrets (secretsCache, voir src/email/verification.ts),
 * déjà connu pour fuiter entre tests d'un même fichier.
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Request, Response } from 'firebase-functions/v1';

const mockGetUser = jest.fn() as jest.Mock;
const mockAdminAuth = { getUser: mockGetUser, getUserByEmail: jest.fn() };

const mockAccessSecretVersion = jest.fn() as jest.Mock;
const mockSecretManagerClient = jest.fn(() => ({ accessSecretVersion: mockAccessSecretVersion }));

const mockSendMail = jest.fn() as jest.Mock;
const mockVerify = jest.fn() as jest.Mock;
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail, verify: mockVerify }));

jest.mock('../../src/admin', () => ({ adminAuth: mockAdminAuth }));
jest.mock('@google-cloud/secret-manager', () => ({ SecretManagerServiceClient: mockSecretManagerClient }));
jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));

import { sendVerificationEmail } from '../../src/email/verification';

describe('sendVerificationEmail - EMAIL_PROVIDER=gmail_oauth2', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseStatus: number;
  let responseData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (mockGetUser as any).mockResolvedValue({
      uid: 'test-uid-123',
      email: 'test@example.com',
      emailVerified: false,
      displayName: 'Test User',
    });
    (mockVerify as any).mockResolvedValue(true);
    (mockSendMail as any).mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    });

    process.env.EMAIL_PROVIDER = 'gmail_oauth2';
    process.env.GMAIL_SENDER_EMAIL = 'ancien@gmail.com';
    process.env.GMAIL_OAUTH_CLIENT_ID = 'client-id';
    process.env.GMAIL_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GMAIL_OAUTH_REFRESH_TOKEN = 'refresh-token';
    process.env.EMAIL_DISPLAY_NAME = 'Test App';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    responseStatus = 0;
    responseData = null;
    mockRequest = { method: 'POST', body: { uid: 'test-uid-123' }, headers: {} };
    mockResponse = {
      set: jest.fn() as any,
      status: jest.fn((status: number) => {
        responseStatus = status;
        return mockResponse as Response;
      }) as any,
      json: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }) as any,
      send: jest.fn() as any,
    };
  });

  afterEach(() => {
    delete process.env.EMAIL_PROVIDER;
    delete process.env.GMAIL_SENDER_EMAIL;
    delete process.env.GMAIL_OAUTH_CLIENT_ID;
    delete process.env.GMAIL_OAUTH_CLIENT_SECRET;
    delete process.env.GMAIL_OAUTH_REFRESH_TOKEN;
    delete process.env.EMAIL_DISPLAY_NAME;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  test('utilise le transport OAuth2 Gmail et pas Hostinger', async () => {
    await sendVerificationEmail(mockRequest as Request, mockResponse as Response);

    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'ancien@gmail.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
      },
    });
    expect((mockSendMail.mock.calls[0][0] as { from: string }).from).toBe('"Test App" <ancien@gmail.com>');
    expect(responseStatus).toBe(200);
    expect(responseData.success).toBe(true);
  });
});
