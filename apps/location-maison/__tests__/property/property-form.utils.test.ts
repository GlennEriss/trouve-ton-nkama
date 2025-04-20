import { describe, expect, it } from '@jest/globals'
import { ApartmentSchema, HomeSchema } from '@/models/schema'
import { getSchema, getTypeProperty } from '../mocks/utils'

describe('getTypeProperty', () => {
  it('should return Apartment for pathname ending with /apartment', () => {
    const type = getTypeProperty('/property/new/apartment');
    expect(type).toBe('Apartment');
  });

  it('should return Building for pathname ending with /building', () => {
    const type = getTypeProperty('/property/new/building');
    expect(type).toBe('Building');
  });

  it('should return Desk for pathname ending with /desk', () => {
    const type = getTypeProperty('/property/new/desk');
    expect(type).toBe('Desk');
  });

  it('should return Home for pathname ending with /home', () => {
    const type = getTypeProperty('/property/new/home');
    expect(type).toBe('Home');
  });

  it('should return Studio for pathname ending with /studio', () => {
    const type = getTypeProperty('/property/new/studio');
    expect(type).toBe('Studio');
  });

  it('should return Shop for pathname ending with /shop', () => {
    const type = getTypeProperty('/property/new/shop');
    expect(type).toBe('Shop');
  });

  it('should return Kiosk for pathname ending with /kiosk', () => {
    const type = getTypeProperty('/property/new/kiosk');
    expect(type).toBe('Kiosk');
  });

  it('should return Room for pathname ending with /room', () => {
    const type = getTypeProperty('/property/new/room');
    expect(type).toBe('Room');
  });

  it('should default to Villa when pathname does not match', () => {
    const type = getTypeProperty('/property/new/unknown');
    expect(type).toBe('Villa');
  });
})

describe('getSchema', () => {
  it('should return ApartmentSchema when type is Apartment', () => {
    const schema = getSchema('Apartment');
    expect(schema).toBe(ApartmentSchema);
  });

  it('should return BuildingSchema when type is Building', () => {
    const schema = getSchema('Building');
    expect(schema).toBeDefined();
  });

  it('should return DeskSchema when type is Desk', () => {
    const schema = getSchema('Desk');
    expect(schema).toBeDefined();
  });

  it('should return HomeSchema when type is Home', () => {
    const schema = getSchema('Home');
    expect(schema).toBe(HomeSchema);
  });

  it('should return StudioSchema when type is Studio', () => {
    const schema = getSchema('Studio');
    expect(schema).toBeDefined();
  });

  it('should return ShopSchema when type is Shop', () => {
    const schema = getSchema('Shop');
    expect(schema).toBeDefined();
  });

  it('should return KioskSchema when type is Kiosk', () => {
    const schema = getSchema('Kiosk');
    expect(schema).toBeDefined();
  });

  it('should return RoomSchema when type is Room', () => {
    const schema = getSchema('Room');
    expect(schema).toBeDefined();
  });

  it('should default to VillaSchema when type is unknown', () => {
    const schema = getSchema('Unknown' as any);
    expect(schema).toBeDefined();
  });
})