import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Loosely typed to mirror the existing service tests' mock repository usage.
const mockWhereGet: any = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit: any = jest.fn();

jest.mock('@/firebase/admin', () => ({ adminApp: { name: 'admin' } }));
jest.mock('@/constantes/firebase-collection-name', () => ({
  __esModule: true,
  default: { properties: 'properties' },
}));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIME' },
  getFirestore: () => ({
    collection: () => ({
      where: () => ({ get: mockWhereGet }),
    }),
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

  it('skips auto-claiming entirely above MAX_AUTO_CLAIM (shared/mistyped contact guard)', async () => {
    const docs = Array.from({ length: MAX_AUTO_CLAIM + 1 }, (_, i) =>
      makeDoc(`p${i}`, { contact: PHONE, createdBy: 'admin-uid' }),
    );
    mockWhereGet.mockResolvedValue({ docs });

    const result = await claimListingsByVerifiedPhone('uid-1', PHONE);

    expect(result).toEqual({ claimedCount: 0, skippedThreshold: true });
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
