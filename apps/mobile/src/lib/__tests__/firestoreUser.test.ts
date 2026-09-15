import { buildNewUserDocument, isValidBirthDate, composeBirthDate, isValidSignupPassword } from '../firestoreUser';

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

describe('composeBirthDate', () => {
  it('compose AAAA-MM-JJ à partir de jour/mois/année avec zéros de tête', () => {
    expect(composeBirthDate('5', '6', '1990')).toBe('1990-06-05');
  });

  it('retourne une chaîne vide si un des trois champs manque', () => {
    expect(composeBirthDate('', '6', '1990')).toBe('');
    expect(composeBirthDate('5', '', '1990')).toBe('');
    expect(composeBirthDate('5', '6', '')).toBe('');
  });
});

describe('isValidSignupPassword', () => {
  it("exige au moins 8 caractères, une majuscule et un chiffre (miroir de FormRegisterSchema, web)", () => {
    expect(isValidSignupPassword('TestPassword123')).toBe(true);
  });

  it('rejette un mot de passe trop court même avec majuscule et chiffre', () => {
    expect(isValidSignupPassword('Ab1defg')).toBe(false);
  });

  it('rejette un mot de passe sans majuscule', () => {
    expect(isValidSignupPassword('testpassword123')).toBe(false);
  });

  it('rejette un mot de passe sans chiffre', () => {
    expect(isValidSignupPassword('TestPassword')).toBe(false);
  });
});

describe('buildNewUserDocument', () => {
  const input = {
    email: 'test@example.com',
    password: 'secret123',
    firstName: 'Jean',
    lastName: 'Mba',
    birthDate: '1990-06-15',
    phoneNumber: '+24174123456',
    accountType: 'User' as const,
  };

  it('construit un document cohérent avec le modèle web (transformToUser)', () => {
    const doc = buildNewUserDocument('uid-1', input);

    expect(doc).toMatchObject({
      uid: 'uid-1',
      firstname: 'Jean',
      lastname: 'Mba',
      email: 'test@example.com',
      country: { code: 'GA', name: 'Gabon' },
      phoneNumbers: ['+24174123456'],
      callNumber: '+24174123456',
      whatsappNumber: '+24174123456',
      roles: ['User'],
      credits: 3,
      favoris: [],
      state: 'IN_PROGRESS',
    });
    expect(doc.updatedAt).toBeTruthy();
  });

  it('ne fait jamais apparaître le mot de passe en clair dans le document', () => {
    const doc = buildNewUserDocument('uid-1', input);
    expect(JSON.stringify(doc)).not.toContain('secret123');
  });

  it("n'ajoute pseudo que s'il est fourni et non vide", () => {
    expect(buildNewUserDocument('uid-1', input)).not.toHaveProperty('pseudo');
    expect(buildNewUserDocument('uid-1', { ...input, pseudo: '  Ma Boutique  ' })).toMatchObject({
      pseudo: 'Ma Boutique',
    });
  });

  it("attribue les rôles ['User', 'Announcer'] pour un compte Annonceur, ['User'] sinon", () => {
    expect(buildNewUserDocument('uid-1', input).roles).toEqual(['User']);
    expect(buildNewUserDocument('uid-1', { ...input, accountType: 'Announcer' }).roles).toEqual(['User', 'Announcer']);
  });

  it('ajoute le numéro WhatsApp à phoneNumbers uniquement quand il diffère du numéro d’appel', () => {
    const same = buildNewUserDocument('uid-1', { ...input, whatsappNumber: '+24174123456' });
    expect(same.phoneNumbers).toEqual(['+24174123456']);

    const different = buildNewUserDocument('uid-1', { ...input, whatsappNumber: '+24166123456' });
    expect(different.phoneNumbers).toEqual(['+24174123456', '+24166123456']);
    expect(different.whatsappNumber).toBe('+24166123456');
  });

  it('réutilise le numéro d’appel comme WhatsApp par défaut si absent', () => {
    const doc = buildNewUserDocument('uid-1', input);
    expect(doc.whatsappNumber).toBe('+24174123456');
    expect(doc.phoneNumbers).toEqual(['+24174123456']);
  });
});
