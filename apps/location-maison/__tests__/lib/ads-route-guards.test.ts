import { isPropertyFormFlowPath } from '@/lib/ads/route-guards';

describe('ads route guards', () => {
  test('returns true for property add root page', () => {
    expect(isPropertyFormFlowPath('/property/add')).toBe(true);
  });

  test('returns true for property add step pages', () => {
    expect(isPropertyFormFlowPath('/property/add/home')).toBe(true);
    expect(isPropertyFormFlowPath('/property/add/studio')).toBe(true);
  });

  test('returns true for property modify pages', () => {
    expect(isPropertyFormFlowPath('/property/modify/abc123')).toBe(true);
  });

  test('returns false for non-form routes', () => {
    expect(isPropertyFormFlowPath('/property')).toBe(false);
    expect(isPropertyFormFlowPath('/search')).toBe(false);
    expect(isPropertyFormFlowPath('/property/additional')).toBe(false);
  });

  test('returns false for empty values', () => {
    expect(isPropertyFormFlowPath('')).toBe(false);
    expect(isPropertyFormFlowPath(undefined)).toBe(false);
    expect(isPropertyFormFlowPath(null)).toBe(false);
  });
});
