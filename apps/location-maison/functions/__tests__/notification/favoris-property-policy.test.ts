import { getChangedFavoritePropertyFields } from '../../src/notification/favoris-property-policy';

describe('getChangedFavoritePropertyFields', () => {
  it('returns changed label for meaningful field updates', () => {
    const changed = getChangedFavoritePropertyFields(
      {
        title: 'Studio Akanda',
        price: 120000,
        city: 'Libreville',
      },
      {
        title: 'Studio Akanda renove',
        price: 120000,
        city: 'Libreville',
      }
    );

    expect(changed).toEqual(['titre']);
  });

  it('ignores whitespace-only string differences', () => {
    const changed = getChangedFavoritePropertyFields(
      {
        title: 'Appartement moderne',
      },
      {
        title: '  Appartement moderne  ',
      }
    );

    expect(changed).toEqual([]);
  });

  it('detects image list changes using normalized values', () => {
    const changed = getChangedFavoritePropertyFields(
      {
        images: [{ fileURL: 'https://cdn/a.jpg', filePATH: 'a.jpg' }],
      },
      {
        images: [{ fileURL: 'https://cdn/b.jpg', filePATH: 'b.jpg' }],
      }
    );

    expect(changed).toEqual(['photos']);
  });

  it('returns empty array when no watched field changed', () => {
    const changed = getChangedFavoritePropertyFields(
      {
        title: 'Maison',
        description: 'Grande cour',
        city: 'Libreville',
      },
      {
        title: 'Maison',
        description: 'Grande cour',
        city: 'Libreville',
      }
    );

    expect(changed).toEqual([]);
  });
});
