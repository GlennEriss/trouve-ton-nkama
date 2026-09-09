import { getImageUrl } from '../propertyImage';

// Régression : ListingDetailScreen lisait auparavant `.imageURL`, un champ qui n'existe pas
// dans le modèle réel (Image = { filePATH, fileURL, thumbPATH?, thumbURL? }, voir
// apps/location-maison/src/models/annonce.d.ts) — aucune image ne s'affichait jamais. Ces
// tests verrouillent le bon champ pour ne pas régresser.
describe('getImageUrl', () => {
  it('retourne undefined sans image', () => {
    expect(getImageUrl(undefined)).toBeUndefined();
  });

  it('retourne la chaîne telle quelle pour le format Algolia legacy (string brute)', () => {
    expect(getImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
  });

  it('utilise fileURL par défaut pour un objet image', () => {
    expect(getImageUrl({ fileURL: 'https://cdn.example.com/full.jpg', thumbURL: 'https://cdn.example.com/thumb.jpg' })).toBe(
      'https://cdn.example.com/full.jpg',
    );
  });

  it('préfère thumbURL quand demandé explicitement', () => {
    expect(
      getImageUrl({ fileURL: 'https://cdn.example.com/full.jpg', thumbURL: 'https://cdn.example.com/thumb.jpg' }, true),
    ).toBe('https://cdn.example.com/thumb.jpg');
  });

  it('retombe sur fileURL si thumbURL est demandé mais absent', () => {
    expect(getImageUrl({ fileURL: 'https://cdn.example.com/full.jpg' }, true)).toBe('https://cdn.example.com/full.jpg');
  });
});
