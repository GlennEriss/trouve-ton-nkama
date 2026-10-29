import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST && process.env.GCLOUD_PROJECT === 'demo-quick-lot9';
const app = enabled ? initializeApp({ projectId: 'demo-quick-lot9' }, 'quick-payment-isolated-test') : null;
const mockDb = app ? getFirestore(app) : null;
jest.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: any, handler: any) => handler }));
jest.mock('../../src/admin', () => ({ get adminDB() { return mockDb; } }));
jest.mock('../../src/payments/mypayga/config', () => ({ MYPAYGA_SECRETS: [], getMyPayGaConfig: () => ({ callbackSecret: 'emulator-only-secret' }) }));
import { quickListingPaymentCallback } from '../../src/payments/quick-listings';
import { computeCallbackHash } from '../../src/payments/mypayga/callback-shared';

(enabled ? it : it.skip)('persistance réelle émulateur : callbacks concurrents, modération préservée, nettoyage vérifié', async () => {
  const id = 'e'.repeat(64);
  const payment = mockDb!.collection('quick_listing_payments').doc(id);
  const listing = mockDb!.collection('quick_listings').doc(id);
  const invoke = async (status = '200') => {
    const body = { uniqueId: id, hash: '', amount: '200', orderStatus: status, statusRequest: '', paymentToken: 'emulator-token', paymentMethod: 'mobile_money', message: '', clientPhone: '074000000', currency: 'XAF' };
    body.hash = computeCallbackHash(body, 'emulator-only-secret');
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), sendStatus: jest.fn() };
    await (quickListingPaymentCallback as any)({ method: 'POST', body }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  };
  try {
    await payment.create({ amountXaf: 200, initiationStarted: true, providerPaymentToken: 'emulator-token', status: 'pending_confirmation' });
    await listing.create({ moderationStatus: null, paymentStatus: 'pending_confirmation', state: 'IN_PROGRESS' });
    await Promise.all([invoke(), invoke()]);
    expect((await payment.get()).data()?.status).toBe('confirmed');
    expect((await listing.get()).data()?.moderationStatus).toBe('PENDING');
    await listing.update({ moderationStatus: 'APPROVED' });
    await invoke('failed'); await invoke();
    expect((await listing.get()).data()?.moderationStatus).toBe('APPROVED');
    expect((await payment.get()).data()?.status).toBe('confirmed');
  } finally {
    await Promise.all([payment.delete(), listing.delete()]);
    expect((await payment.get()).exists).toBe(false);
    expect((await listing.get()).exists).toBe(false);
    await deleteApp(app!);
  }
}, 20000);
