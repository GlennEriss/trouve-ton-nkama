import { getUserDisplayName, getUserDisplayInitial, generateColorFromName } from '../userDisplay';

// Miroir de user-display-name.ts + generateColorFromName.ts (web) — voir
// [[feedback-mobile-reuse-pwa-design]].
describe('getUserDisplayName', () => {
  it('privilégie le pseudo quand il est renseigné', () => {
    expect(getUserDisplayName({ pseudo: 'Ma Boutique', firstname: 'Jean', lastname: 'Mba' })).toBe('Ma Boutique');
  });

  it('retombe sur prénom + nom si pas de pseudo', () => {
    expect(getUserDisplayName({ firstname: 'Jean', lastname: 'Mba' })).toBe('Jean Mba');
  });

  it('gère un prénom seul ou un nom seul', () => {
    expect(getUserDisplayName({ firstname: 'Jean' })).toBe('Jean');
    expect(getUserDisplayName({ lastname: 'Mba' })).toBe('Mba');
  });

  it('retourne null si aucun nom exploitable', () => {
    expect(getUserDisplayName({})).toBeNull();
    expect(getUserDisplayName(null)).toBeNull();
    expect(getUserDisplayName(undefined)).toBeNull();
  });

  it('ignore un pseudo vide ou uniquement des espaces', () => {
    expect(getUserDisplayName({ pseudo: '   ', firstname: 'Jean', lastname: 'Mba' })).toBe('Jean Mba');
  });
});

describe('getUserDisplayInitial', () => {
  it("retourne l'initiale en majuscule du nom affiché", () => {
    expect(getUserDisplayInitial({ firstname: 'jean', lastname: 'Mba' })).toBe('J');
    expect(getUserDisplayInitial({ pseudo: 'ma boutique' })).toBe('M');
  });

  it('retourne une chaîne vide si aucun nom exploitable', () => {
    expect(getUserDisplayInitial({})).toBe('');
  });
});

describe('generateColorFromName', () => {
  it('retourne une couleur hsl pastel déterministe pour un même nom', () => {
    const color1 = generateColorFromName('Jean Mba');
    const color2 = generateColorFromName('Jean Mba');
    expect(color1).toBe(color2);
    expect(color1).toMatch(/^hsl\(-?\d+, 70%, 80%\)$/);
  });

  it('retourne des couleurs différentes pour des noms différents', () => {
    expect(generateColorFromName('Jean Mba')).not.toBe(generateColorFromName('Marie Nzue'));
  });

  it('retourne une couleur par défaut si le nom est absent', () => {
    expect(generateColorFromName(undefined)).toBe('#ccc');
    expect(generateColorFromName(null)).toBe('#ccc');
  });
});
