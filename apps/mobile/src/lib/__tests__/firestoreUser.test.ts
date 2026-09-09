import { buildNewUserDocument, isValidBirthDate } from '../firestoreUser';

describe('isValidBirthDate', () => {
  it('rejette un format invalide', () => {
    expect(isValidBirthDate('01/01/2000')).toBe(false);
    expect(isValidBirthDate('2000-1-1')).toBe(false);
    expect(isValidBirthDate('')).toBe(false);
  });

  it('rejette une date calendaire inexistante', () => {
    expect(isValidBirthDate('2000-02-30')).toBe(false);
    expect(isValidBirthDate('2000-13-01')).toBe(false);
  });

  it('rejette un utilisateur de moins de 18 ans', () => {
    const now = new Date();
    const seventeenYearsAgo = `${now.getFullYear() - 17}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(isValidBirthDate(seventeenYearsAgo)).toBe(false);
  });

  it('accepte un utilisateur de 18 ans exactement aujourd\'hui', () => {
    const now = new Date();
    const eighteenYearsAgo = `${now.getFullYear() - 18}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(isValidBirthDate(eighteenYearsAgo)).toBe(true);
  });

  it('accepte une date valide bien au-delà de 18 ans', () => {
    expect(isValidBirthDate('1990-06-15')).toBe(true);
  });
});

describe('buildNewUserDocument', () => {
  const input = {
    email: 'test@example.com',
    password: 'secret123',
    firstName: 'Jean',
    lastName: 'Mba',
    birthDate: '1990-06-15',
    phoneNumber: '074123456',
  };

  it('construit un document cohérent avec le modèle web (transformToUser)', () => {
    const doc = buildNewUserDocument('uid-1', input);

    expect(doc).toMatchObject({
      uid: 'uid-1',
      firstname: 'Jean',
      lastname: 'Mba',
      email: 'test@example.com',
      country: { code: 'GA', name: 'Gabon' },
      phoneNumbers: ['074123456'],
      roles: ['User'],
      credits: 3,
      favoris: [],
      state: 'IN_PROGRESS',
    });
  });

  it('ne fait jamais apparaître le mot de passe en clair dans le document', () => {
    const doc = buildNewUserDocument('uid-1', input);
    expect(JSON.stringify(doc)).not.toContain('secret123');
  });
});
