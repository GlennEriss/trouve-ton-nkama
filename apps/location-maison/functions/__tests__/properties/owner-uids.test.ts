import { buildOwnerUids, hasExpectedOwnerUids } from '../../src/properties/owner-uids-policy';

describe('ownerUids policy', () => {
  it('normalise et déduplique les créateurs et revendicateurs', () => {
    expect(buildOwnerUids({ createdBy: ' owner-2 ', claimedBy: 'owner-1' }))
      .toEqual(['owner-1', 'owner-2']);
    expect(buildOwnerUids({ createdBy: 'owner-1', claimedBy: 'owner-1' }))
      .toEqual(['owner-1']);
  });

  it('détecte un tableau déjà synchronisé indépendamment de son ordre', () => {
    expect(hasExpectedOwnerUids(['owner-2', 'owner-1'], ['owner-1', 'owner-2'])).toBe(true);
    expect(hasExpectedOwnerUids(['owner-1'], ['owner-1', 'owner-2'])).toBe(false);
  });
});
