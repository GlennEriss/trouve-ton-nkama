const mockSend = jest.fn();
const mockGet = jest.fn();
let job: any;
const mockRef = {};
jest.mock('firebase-functions/v1', () => ({ runWith: () => ({ firestore: { document: () => ({ onWrite: (handler: unknown) => handler }) } }), logger: { error: jest.fn() } }));
jest.mock('../../src/admin', () => ({ adminDB: {
  collection: () => ({ doc: () => mockRef }),
  runTransaction: async (callback: any) => callback({
    get: async () => ({ data: () => job }),
    set: (_ref: unknown, data: any) => { job = { ...job, ...data }; },
    update: (_ref: unknown, data: any) => { job = { ...job, ...data }; },
  }),
} }));
jest.mock('../../src/email/transport', () => ({ createEmailTransport: () => ({ sendMail: mockSend, close: jest.fn() }) }));
import { onListingPendingNotifyAdmin } from '../../src/email/moderation-alert';
const pending = { moderationStatus: 'PENDING' };
const change = { before: { data: () => undefined }, after: { data: () => pending, ref: { get: mockGet } } };
const invoke = () => (onListingPendingNotifyAdmin as any)(change, { params: { propertyId: 'p1' }, eventId: 'event1', timestamp: '2026-10-27' });
const originalEnv = { ...process.env };
beforeEach(() => {
  job = undefined; jest.clearAllMocks();
  process.env.ADMIN_MODERATION_EMAIL_ENABLED = 'true';
  process.env.HOSTINGER_EMAIL_USER = 'sender@gmail.com';
  process.env.HOSTINGER_EMAIL_PASS = 'fake-test-only';
  process.env.ADMIN_MODERATION_EMAIL_TO = 'receiver@gmail.com';
  process.env.ADMIN_MODERATION_APP_URL = 'https://admin.example.com';
  delete process.env.FUNCTIONS_EMULATOR;
  mockGet.mockResolvedValue({ data: () => pending });
  mockSend.mockResolvedValue({ accepted: ['receiver@gmail.com'], messageId: 'smtp-id' });
});
afterAll(() => { process.env = originalEnv; });
it('envoie puis ignore le rejeu', async () => {
  await invoke(); await invoke();
  expect(mockSend).toHaveBeenCalledTimes(1); expect(job.status).toBe('sent');
});
it('ne renvoie pas pendant un bail actif', async () => {
  job = { status: 'processing', leaseUntil: Date.now() + 60000 };
  await expect(invoke()).rejects.toThrow('en cours'); expect(mockSend).not.toHaveBeenCalled();
});
it('reprend un bail expiré', async () => {
  job = { status: 'processing', leaseUntil: 0, attempts: 1 };
  await invoke(); expect(job.status).toBe('sent'); expect(job.attempts).toBe(2);
});
it('reprend après un échec SMTP sans marquer envoyé', async () => {
  mockSend.mockRejectedValueOnce(new Error('SMTP'));
  await expect(invoke()).rejects.toThrow(); expect(job.status).toBe('retry');
  await invoke(); expect(job.status).toBe('sent');
});
it('refuse un destinataire non accepté', async () => {
  mockSend.mockResolvedValue({ accepted: [], rejected: ['receiver@gmail.com'] });
  await expect(invoke()).rejects.toThrow(); expect(job.status).toBe('retry');
});
it('borne les tentatives', async () => {
  job = { status: 'retry', attempts: 5 }; await invoke();
  expect(job.status).toBe('failed'); expect(mockSend).not.toHaveBeenCalled();
});
it('ignore une annonce déjà traitée', async () => {
  mockGet.mockResolvedValue({ data: () => ({ moderationStatus: 'APPROVED' }) });
  await invoke(); expect(job.status).toBe('skipped'); expect(mockSend).not.toHaveBeenCalled();
});
it('reste inactif sans activation', async () => {
  process.env.ADMIN_MODERATION_EMAIL_ENABLED = 'false'; await invoke(); expect(mockSend).not.toHaveBeenCalled();
});
it('ne simule pas un succès dans un émulateur', async () => {
  process.env.FUNCTIONS_EMULATOR = 'true'; delete process.env.FORCE_REAL_EMAILS;
  await invoke(); expect(job).toBeUndefined(); expect(mockSend).not.toHaveBeenCalled();
});
it('refuse une configuration incomplète', async () => {
  delete process.env.ADMIN_MODERATION_EMAIL_TO;
  await expect(invoke()).rejects.toThrow('incomplète'); expect(mockSend).not.toHaveBeenCalled();
});
