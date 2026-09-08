import { resolveNotificationTarget } from '../notificationRouting';

describe('resolveNotificationTarget', () => {
  it('retourne null sans actionUrl', () => {
    expect(resolveNotificationTarget(undefined)).toBeNull();
    expect(resolveNotificationTarget(null)).toBeNull();
  });

  it('extrait l\'id de propriété depuis /houseDetails/:id', () => {
    expect(resolveNotificationTarget('/houseDetails/abc123')).toEqual({ kind: 'listing', objectID: 'abc123' });
  });

  it('extrait l\'id de propriété depuis /property/:id', () => {
    expect(resolveNotificationTarget('/property/xyz789')).toEqual({ kind: 'listing', objectID: 'xyz789' });
  });

  it('reconnaît /favoris', () => {
    expect(resolveNotificationTarget('/favoris')).toEqual({ kind: 'favoris' });
  });

  it('ignore les destinations sans équivalent mobile (profil, gifts...)', () => {
    expect(resolveNotificationTarget('/profil/informations')).toBeNull();
    expect(resolveNotificationTarget('/gifts')).toBeNull();
    expect(resolveNotificationTarget('/login-and-security')).toBeNull();
  });
});
