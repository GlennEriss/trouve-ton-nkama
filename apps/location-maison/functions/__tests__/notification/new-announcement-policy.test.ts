import { matchesNewAnnouncementCriteria } from '../../src/notification/new-announcement-policy';

describe('matchesNewAnnouncementCriteria', () => {
  it('returns true on country fallback when criteria are missing', () => {
    expect(
      matchesNewAnnouncementCriteria(
        {
          uid: 'u1',
          country: { code: 'GA' },
          notificationParameter: { isNewAnnouncement: true },
        },
        {
          countryCode: 'GA',
          province: 'Estuaire',
          city: 'Libreville',
          typeProperty: 'Home',
        }
      )
    ).toBe(true);
  });

  it('returns false on country fallback mismatch', () => {
    expect(
      matchesNewAnnouncementCriteria(
        {
          uid: 'u1',
          country: { code: 'SN' },
          notificationParameter: { isNewAnnouncement: true },
        },
        {
          countryCode: 'GA',
        }
      )
    ).toBe(false);
  });

  it('matches explicit criteria from metadata', () => {
    expect(
      matchesNewAnnouncementCriteria(
        {
          uid: 'u1',
          country: { code: 'SN' },
          notificationParameter: { isNewAnnouncement: true },
          metadata: {
            newAnnouncementCriteria: {
              countryCodes: ['ga'],
              provinces: ['estuaire'],
              cities: ['libreville'],
              typeProperties: ['home'],
            },
          },
        },
        {
          countryCode: 'GA',
          province: 'Estuaire',
          city: 'Libreville',
          typeProperty: 'Home',
        }
      )
    ).toBe(true);
  });
});
