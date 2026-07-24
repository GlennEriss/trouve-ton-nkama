import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Loosely typed to mirror the existing service tests' mock repository usage.
const mockWhereGet: any = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit: any = jest.fn();
const mockReviewDocGet: any = jest.fn();
const mockReviewDocSet: any = jest.fn();

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }));
jest.mock('@/constantes/firebase-collection-name', () => ({
  __esModule: true,
  default: { properties: 'properties', listing_claim_reviews: 'listing_claim_reviews' },
}));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
  getFirestore: () => ({
    collection: (name: string) => {
      if (name === 'listing_claim_reviews') {
        return { doc: () => ({ get: mockReviewDocGet, set: mockReviewDocSet }) };
      }
      return { where: () => ({ get: mockWhereGet }) };
    },
    batch: () => ({
      update: (...args: unknown[]) => mockBatchUpdate(...args),
      commit: (...args: unknown[]) => mockBatchCommit(...args),
    }),
  }),
}));

import { claimListingsByVerifiedPhone, MAX_AUTO_CLAIM } from '../services/listing-claim.service';

const PHONE = '+24166123456';

function makeDoc(id: string, data: Record<string, unknown>) {
  return { id, ref: { id }, data: () => data };
}

describe('claimListingsByVerifiedPhone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
    mockReviewDocGet.mockResolvedValue({ exists: false, data: () => undefined });
    mockReviewDocSet.mockResolvedValue(undefined);
  });

  it('claims listings matching the verified phone that are neither owned nor already claimed', async () => {
    mockWhereGet.mockResolvedValue({
      docs: [
        makeDoc('p1', { contact: PHONE, createdBy: 'admin-uid' }),
        makeDoc('p2', { contact: PHONE, createdBy: 'admin-uid', claimedBy: 'someone-else' }),
        makeDoc('p3', { contact: PHONE, createdBy: 'uid-1' }), // already owned by this uid
      ],
    });

    const result = await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(result).toEqual({ claimedCount: 1, skippedThreshold: false });
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { id: 'p1' },
      { claimedBy: 'uid-1', claimedAt: 'SERVER_TIME' },
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when nothing matches', async () => {
    mockWhereGet.mockResolvedValue({ docs: [] });

    const result = await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(result).toEqual({ claimedCount: 0, skippedThreshold: false });
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('is a no-op when every match is already owned or claimed (idempotent)', async () => {
    mockWhereGet.mockResolvedValue({
      docs: [
        makeDoc('p1', { contact: PHONE, createdBy: 'uid-1' }),
        makeDoc('p2', { contact: PHONE, claimedBy: 'uid-1' }),
      ],
    });

    const result = await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(result).toEqual({ claimedCount: 0, skippedThreshold: false });
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('skips auto-claiming entirely above MAX_AUTO_CLAIM and records a pending review', async () => {
    const docs = Array.from({ length: MAX_AUTO_CLAIM + 1 }, (_, i) =>
      makeDoc(`p${i}`, { contact: PHONE, createdBy: 'admin-uid' }),
    );
    mockWhereGet.mockResolvedValue({ docs });

    const result = await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(result).toEqual({ claimedCount: 0, skippedThreshold: true });
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
    expect(mockReviewDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'uid-1',
        verifiedPhone: PHONE,
        matchCount: MAX_AUTO_CLAIM + 1,
        status: 'pending',
        lastAttemptAt: 'SERVER_TIME',
        createdAt: 'SERVER_TIME',
      }),
      { merge: true },
    );
  });

  it('does not overwrite a review an admin already resolved', async () => {
    const docs = Array.from({ length: MAX_AUTO_CLAIM + 1 }, (_, i) =>
      makeDoc(`p${i}`, { contact: PHONE, createdBy: 'admin-uid' }),
    );
    mockWhereGet.mockResolvedValue({ docs });
    mockReviewDocGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) });

    await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(mockReviewDocSet).not.toHaveBeenCalled();
  });
});
