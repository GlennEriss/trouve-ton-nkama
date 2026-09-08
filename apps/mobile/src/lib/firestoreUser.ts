// Miroir mobile de apps/location-maison/src/features/auth/services/auth.service.ts
// (transformToUser) — même collection `users`, mêmes champs, pour que le compte créé côté
// mobile soit identique à un compte créé côté web (unicité téléphone/email, crédits
// d'accueil, rôles...).
export type SignupInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  phoneNumber: string;
};

export function buildNewUserDocument(uid: string, data: SignupInput) {
  const now = new Date();
  return {
    uid,
    login: data.email,
    firstname: data.firstName,
    lastname: data.lastName,
    birthDate: data.birthDate,
    email: data.email,
    country: { code: 'GA', name: 'Gabon' },
    phoneNumbers: [data.phoneNumber],
    callNumber: data.phoneNumber,
    whatsappNumber: data.phoneNumber,
    roles: ['User'],
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
