import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { auth } from '@/next-auth/auth';
import { adminApp } from '@/firebase/admin';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import {
  normalizePhoneNumberForFirebase,
  validatePhoneNumberForSupportedCountries,
} from '@/lib/phoneValidation';
import { createLogger } from '@/lib/logger';
import { jsonApiError } from '@/lib/api/error-response';
import type { Role, User } from '@/models/authentication';
import {
  CompleteProfileErrorCode,
  type CompleteProfileBirthdate,
} from '@/features/auth/services/complete-profile.service.interface';

const logger = createLogger('api.auth.complete-profile');

/**
 * Finalise le profil (téléphone/Google/Facebook) — DOIT passer par l'Admin SDK.
 *
 * Avant ce correctif, l'écriture Firestore se faisait via le SDK client, directement depuis
 * le navigateur (voir complete-profile.service.ts). Ça ne fonctionne QUE si `request.auth`
 * (côté Firestore) correspond à une session Firebase Auth réellement établie dans le
 * navigateur — or ce n'est le cas ni pour Google (le credential Firebase est échangé
 * server-side dans le callback NextAuth, jamais dans le navigateur — voir
 * oauth-google.service.ts) ni, de façon fiable, pour tous les cas téléphone. Résultat :
 * PERMISSION_DENIED silencieux, exactement le même bug déjà corrigé pour la création de
 * compte téléphone (phone-auth.service.ts, 2026-08-26).
 */
function usersCollection() {
  if (!adminApp) {
    throw new Error('Firebase admin non initialisé.');
  }
  return getFirestore(adminApp).collection(firebaseCollectionNames.users);
}

function parseBirthdate(birthdate: CompleteProfileBirthdate):
  | { ok: true; value: string }
  | { ok: false; error: CompleteProfileErrorCode.INVALID_BIRTHDATE | CompleteProfileErrorCode.UNDERAGE } {
  const day = Number.parseInt(birthdate?.day, 10);
  const month = Number.parseInt(birthdate?.month, 10);
  const year = Number.parseInt(birthdate?.year, 10);

  if (
    Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year) ||
    day < 1 || day > 31 || month < 1 || month > 12 || year < 1900
  ) {
    return { ok: false, error: CompleteProfileErrorCode.INVALID_BIRTHDATE };
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return { ok: false, error: CompleteProfileErrorCode.INVALID_BIRTHDATE };
  }

  const today = new Date();
  const age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  const dayDiff = today.getDate() - day;
  const realAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  if (realAge < 18) {
    return { ok: false, error: CompleteProfileErrorCode.UNDERAGE };
  }

  return { ok: true, value: `${birthdate.year}-${birthdate.month}-${birthdate.day}` };
}

function errorStatus(code: CompleteProfileErrorCode): number {
  switch (code) {
    case CompleteProfileErrorCode.USER_NOT_FOUND:
      return 404;
    case CompleteProfileErrorCode.UNKNOWN_ERROR:
    case CompleteProfileErrorCode.UPDATE_FAILED:
      return 500;
    default:
      return 400;
  }
}

function errorMessage(code: CompleteProfileErrorCode): string {
  switch (code) {
    case CompleteProfileErrorCode.INVALID_PHONE:
      return 'Le numéro de téléphone est invalide';
    case CompleteProfileErrorCode.INVALID_WHATSAPP:
      return 'Le numéro WhatsApp est invalide';
    case CompleteProfileErrorCode.INVALID_BIRTHDATE:
      return 'La date de naissance est invalide';
    case CompleteProfileErrorCode.UNDERAGE:
      return 'Vous devez avoir au moins 18 ans';
    case CompleteProfileErrorCode.TERMS_NOT_ACCEPTED:
      return "Vous devez accepter les conditions d'utilisation et la politique de confidentialité";
    case CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED:
      return "Vous devez accepter les conditions d'annonceur";
    case CompleteProfileErrorCode.USER_NOT_FOUND:
      return 'Utilisateur introuvable';
    case CompleteProfileErrorCode.UPDATE_FAILED:
      return 'Impossible de mettre à jour le profil';
    default:
      return 'Une erreur inattendue est survenue';
  }
}

function fail(code: CompleteProfileErrorCode) {
  return jsonApiError(errorStatus(code), code, errorMessage(code));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    // La session (pas le corps de la requête) fait foi pour l'identité : on ne complète que
    // SON PROPRE profil, jamais celui transmis par le client.
    const uid = session?.user?.uid;
    if (!uid) {
      return jsonApiError(401, 'UNAUTHENTICATED', 'Session invalide.');
    }

    const body = await request.json();
    const {
      firstname,
      lastname,
      pseudo,
      phoneNumber,
      whatsappNumber,
      birthdate,
      accountType,
      acceptTerms,
      acceptAnnouncerTerms,
      metadata,
    } = body || {};

    const phoneValidation = validatePhoneNumberForSupportedCountries(phoneNumber);
    if (!phoneValidation.isValid) {
      return fail(CompleteProfileErrorCode.INVALID_PHONE);
    }

    const rawWhatsapp = typeof whatsappNumber === 'string' ? whatsappNumber.trim() : '';
    if (rawWhatsapp && !validatePhoneNumberForSupportedCountries(rawWhatsapp).isValid) {
      return fail(CompleteProfileErrorCode.INVALID_WHATSAPP);
    }

    const birthdateResult = parseBirthdate(birthdate);
    if (!birthdateResult.ok) {
      return fail(birthdateResult.error);
    }

    if (!acceptTerms) {
      return fail(CompleteProfileErrorCode.TERMS_NOT_ACCEPTED);
    }

    if (accountType === 'Announcer' && !acceptAnnouncerTerms) {
      return fail(CompleteProfileErrorCode.ANNOUNCER_TERMS_NOT_ACCEPTED);
    }

    const trimmedFirstname = String(firstname ?? '').trim();
    const trimmedLastname = String(lastname ?? '').trim();
    const searchableName = `${trimmedFirstname} ${trimmedLastname}`.trim();
    const roles: Role[] = accountType === 'Announcer' ? ['User', 'Announcer'] : ['User'];

    const userRef = usersCollection().doc(uid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      return fail(CompleteProfileErrorCode.USER_NOT_FOUND);
    }
    const existingUser = snapshot.data() as User;

    const normalizedPhone = normalizePhoneNumberForFirebase(phoneNumber);
    const previousPhone = existingUser.phoneNumbers?.[0]
      ? normalizePhoneNumberForFirebase(existingUser.phoneNumbers[0])
      : '';
    // Un compte téléphone garde son statut vérifié tant que le numéro ne change pas ; un
    // utilisateur Google qui saisit un numéro reste non vérifié.
    const phoneNumberVerified = Boolean(existingUser.phoneNumberVerified) && normalizedPhone === previousPhone;

    const normalizedWhatsapp = rawWhatsapp ? normalizePhoneNumberForFirebase(rawWhatsapp) : normalizedPhone;
    const phoneNumbers = normalizedWhatsapp === normalizedPhone
      ? [normalizedPhone]
      : [normalizedPhone, normalizedWhatsapp];

    const trimmedPseudo = typeof pseudo === 'string' ? pseudo.trim() : '';

    const updates: Record<string, unknown> = {
      firstname: trimmedFirstname,
      lastname: trimmedLastname,
      ...(trimmedPseudo ? { pseudo: trimmedPseudo } : {}),
      searchableName,
      phoneNumbers,
      callNumber: normalizedPhone,
      whatsappNumber: normalizedWhatsapp,
      phoneNumberVerified,
      birthDate: birthdateResult.value,
      roles,
      metadata: {
        ...(existingUser.metadata ?? {}),
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
        needsProfileCompletion: false,
      },
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.update(updates);

    const updatedUser: User = { ...existingUser, ...updates, uid, id: uid } as User;

    logger.info('Complete profile succeeded', { uid, accountType, roles });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error('Complete profile failed', { error });
    return fail(CompleteProfileErrorCode.UNKNOWN_ERROR);
  }
}
