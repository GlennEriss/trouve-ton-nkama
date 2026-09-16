// Miroir mobile de apps/location-maison/src/features/auth/services/auth.service.ts
// (transformToUser) — même collection `users`, mêmes champs, pour que le compte créé côté
// mobile soit identique à un compte créé côté web (unicité téléphone/email, crédits
// d'accueil, rôles, pseudo, numéro WhatsApp séparé...).
export type AccountType = 'User' | 'Announcer';

export type SignupInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  pseudo?: string;
  birthDate: string; // YYYY-MM-DD
  phoneNumber: string; // déjà au format E.164 (+241...)
  whatsappNumber?: string; // déjà au format E.164 ; si absent, réutilise phoneNumber
  accountType: AccountType;
};

export function buildNewUserDocument(uid: string, data: SignupInput) {
  const now = new Date();
  const whatsappNumber = data.whatsappNumber?.trim() || data.phoneNumber;
  // Comme transformToUser (web) : phoneNumbers reste la source pour l'auth et l'auto-
  // attribution — le numéro WhatsApp y est ajouté quand il diffère, pas de doublon sinon.
  const phoneNumbers = whatsappNumber === data.phoneNumber ? [data.phoneNumber] : [data.phoneNumber, whatsappNumber];
  const roles = data.accountType === 'Announcer' ? ['User', 'Announcer'] : ['User'];

  return {
    uid,
    login: data.email,
    firstname: data.firstName,
    lastname: data.lastName,
    ...(data.pseudo?.trim() ? { pseudo: data.pseudo.trim() } : {}),
    birthDate: data.birthDate,
    email: data.email,
    country: { code: 'GA', name: 'Gabon' },
    phoneNumbers,
    callNumber: data.phoneNumber,
    whatsappNumber,
    roles,
    emailVerified: false,
    providers: ['CREDENTIALS'],
    metadata: {},
    favoris: [],
    credits: 3,
    state: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
  };
}

// Miroir de handleNewGoogleUser (web, oauth-google.service.ts) : mêmes champs par défaut pour
// un premier compte Google — profil vide (firstname/lastname/phoneNumbers/birthDate), rôle User,
// providers ['GOOGLE'], metadata.needsProfileCompletion true (le compte est utilisable tel quel,
// mais web redirige ensuite vers une page "compléter mon profil" ; le mobile n'a pas encore cet
// écran — voir signInWithGoogle, googleAuth.ts).
function defaultNotificationParameter() {
  return {
    isNew: true,
    isAccountActivity: true,
    isNewAnnouncement: true,
    isFavoris: true,
    isPersonalizedSuggestions: true,
    isSystemUpdated: true,
  };
}

export function buildNewGoogleUserDocument(uid: string, data: { email: string; photoURL?: string | null }) {
  const now = new Date();
  return {
    uid,
    login: data.email,
    firstname: '',
    lastname: '',
    email: data.email,
    image: data.photoURL ?? '',
    phoneNumbers: [],
    phoneNumberVerified: false,
    birthDate: '',
    roles: ['User'],
    searchableName: '',
    providers: ['GOOGLE'],
    metadata: { needsProfileCompletion: true },
    notificationParameter: defaultNotificationParameter(),
    favoris: [],
    credits: 3,
    state: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
  };
}

const MIN_AGE_YEARS = 18;

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yearRaw, monthRaw, dayRaw] = value.split('-');
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);

  if (
    Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) ||
    year < 1900 || month < 1 || month > 12 || day < 1 || day > 31
  ) {
    return false;
  }

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  return realAge >= MIN_AGE_YEARS;
}

// Compose AAAA-MM-JJ à partir des 3 champs séparés jour/mois/année (voir DateSelect, web) —
// retourne '' si l'un des trois manque, pour laisser isValidBirthDate rejeter proprement.
export function composeBirthDate(day: string, month: string, year: string): string {
  if (!day.trim() || !month.trim() || !year.trim()) return '';
  return `${year.trim()}-${month.trim().padStart(2, '0')}-${day.trim().padStart(2, '0')}`;
}

// Miroir de FormRegisterSchema.password (web, schema.ts) : 8 caractères minimum + au moins
// une majuscule + au moins un chiffre. Le mobile n'appliquait avant que la longueur, ce qui
// laissait passer des mots de passe que le web refuse (ex. "aaaaaaaa").
export function isValidSignupPassword(value: string): boolean {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

// Miroir de FormRegisterSchema.email (web, schema.ts, z.string().email()) — regex volontairement
// simple (présence d'un @ avec du texte de part et d'autre, un domaine avec un point) : le
// mobile n'avait aucune validation de format avant (seul `.trim()` non-vide), ce qui laissait
// passer un email sans "@".
export function isValidSignupEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
