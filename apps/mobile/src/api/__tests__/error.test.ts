import { ApiError, parseApiError } from '../error';

describe('parseApiError', () => {
  it("construit une ApiError à partir de l'enveloppe backend standard", () => {
    const err = parseApiError(400, { success: false, error: { code: 'VALIDATION', message: 'Champ requis.' } });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('Champ requis.');
  });

  it('transmet les details optionnels', () => {
    const err = parseApiError(422, { success: false, error: { code: 'X', message: 'm', details: { field: 'city' } } });
    expect(err.details).toEqual({ field: 'city' });
  });

  it('retombe sur un message générique si le corps ne suit pas l\'enveloppe', () => {
    const err = parseApiError(500, { unexpected: 'shape' });
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.message).toBe('Une erreur inattendue est survenue.');
  });

  it('retombe sur un message générique pour un corps null (JSON invalide)', () => {
    const err = parseApiError(500, null);
    expect(err.code).toBe('UNKNOWN_ERROR');
  });

  it('ne lève jamais, quel que soit le corps', () => {
    expect(() => parseApiError(500, 'une simple chaîne')).not.toThrow();
    expect(() => parseApiError(500, 42)).not.toThrow();
    expect(() => parseApiError(500, undefined)).not.toThrow();
  });
});
