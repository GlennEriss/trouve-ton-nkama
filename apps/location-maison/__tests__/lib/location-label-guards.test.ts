import { isDisplayableLocationLabel } from '@/lib/location/label-guards';

describe('location label guards', () => {
  test('returns false for empty values', () => {
    expect(isDisplayableLocationLabel('')).toBe(false);
    expect(isDisplayableLocationLabel('   ')).toBe(false);
    expect(isDisplayableLocationLabel(undefined)).toBe(false);
    expect(isDisplayableLocationLabel(null)).toBe(false);
  });

  test('returns false for technical osm labels', () => {
    expect(isDisplayableLocationLabel('osm_node_9064580277')).toBe(false);
    expect(isDisplayableLocationLabel('OSM_WAY_12345')).toBe(false);
    expect(isDisplayableLocationLabel('osm_relation_5678')).toBe(false);
    expect(isDisplayableLocationLabel('  osm_node_abc-123  ')).toBe(false);
  });

  test('returns true for user-facing labels', () => {
    expect(isDisplayableLocationLabel('Libreville')).toBe(true);
    expect(isDisplayableLocationLabel('Owendo Pédiatrie')).toBe(true);
    expect(isDisplayableLocationLabel('PK9')).toBe(true);
  });
});
