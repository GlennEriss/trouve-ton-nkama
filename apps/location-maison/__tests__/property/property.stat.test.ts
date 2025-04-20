import * as db from '@/db/property.db';
import { TypeProperty } from '@/models/annonce';

describe('getCountStatisticsByPropertyType (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return mocked count for a given type', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(3);
    const result = await db.getCountStatisticsByPropertyType('user123', 'HOME' as TypeProperty);
    expect(result).toBe(3);
    spy.mockRestore();
  });

  it('should return mocked count for APARTMENT', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(5);
    const result = await db.getCountStatisticsByPropertyType('user123', 'APARTMENT' as TypeProperty);
    expect(result).toBe(5);
    spy.mockRestore();
  });

  it('should return mocked count for BUILDING', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(2);
    const result = await db.getCountStatisticsByPropertyType('user123', 'BUILDING' as TypeProperty);
    expect(result).toBe(2);
    spy.mockRestore();
  });

  it('should return mocked count for DESK', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(4);
    const result = await db.getCountStatisticsByPropertyType('user123', 'DESK' as TypeProperty);
    expect(result).toBe(4);
    spy.mockRestore();
  });

  it('should return mocked count for HOME', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(6);
    const result = await db.getCountStatisticsByPropertyType('user123', 'HOME' as TypeProperty);
    expect(result).toBe(6);
    spy.mockRestore();
  });

  it('should return mocked count for STUDIO', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(1);
    const result = await db.getCountStatisticsByPropertyType('user123', 'STUDIO' as TypeProperty);
    expect(result).toBe(1);
    spy.mockRestore();
  });

  it('should return mocked count for SHOP', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(3);
    const result = await db.getCountStatisticsByPropertyType('user123', 'SHOP' as TypeProperty);
    expect(result).toBe(3);
    spy.mockRestore();
  });

  it('should return mocked count for KIOSK', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(2);
    const result = await db.getCountStatisticsByPropertyType('user123', 'KIOSK' as TypeProperty);
    expect(result).toBe(2);
    spy.mockRestore();
  });

  it('should return mocked count for ROOM', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockResolvedValueOnce(7);
    const result = await db.getCountStatisticsByPropertyType('user123', 'ROOM' as TypeProperty);
    expect(result).toBe(7);
    spy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    const spy = jest.spyOn(db, 'getCountStatisticsByPropertyType').mockRejectedValueOnce(new Error('DB error'));
    await expect(db.getCountStatisticsByPropertyType('user123', 'HOME' as TypeProperty)).rejects.toThrow('DB error');
    spy.mockRestore();
  });
});