import { getFirebaseAdminAuth } from "@/lib/firebase/firebase-admin";
import { normalizeGabonPhoneE164 } from "@/lib/phone/gabon-phone";
import type {
  CreateListingForAnnouncerInput,
  CreateListingForAnnouncerResult,
  CreateProvisionedAccountInput,
  CreateProvisionedAccountResult,
} from "@/modules/account-provisioning/domain/types";
import {
  createPlatformUserDocument,
  createPropertyDocumentForAnnouncer,
  findPlatformUserByEmailOrLogin,
  findPlatformUserByPhone,
  findPlatformUserByUid,
} from "@/modules/account-provisioning/infrastructure/account-provisioning.repository";

const DEFAULT_CREDITS = 3;

function sanitizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Normalize to compact E.164 (+241XXXXXXXX) — the same stored form the OTP
 * (Firebase Phone Auth) login produces, so a provisioned account's number
 * matches on phone sign-in. Throws rather than silently persisting an
 * unparseable number, since this is a data-entry boundary.
 */
function sanitizePhone(value: string) {
  const normalized = normalizeGabonPhoneE164(value);
  if (!normalized) {
    throw new Error("ACCOUNT_PHONE_INVALID");
  }
  return normalized;
}

function hasAnnouncerRole(roles: string[]) {
  return roles.some((role) => role.trim().toLowerCase() === "announcer");
}

function sanitizeTags(tags: string[] | undefined) {
  if (!tags) {
    return [] as string[];
  }

  const values = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 6);

  return Array.from(new Set(values));
}

function normalizeBirthDate(input: CreateProvisionedAccountInput) {
  if (input.birthDate && input.birthDate.trim()) {
    return input.birthDate.trim();
  }

  if (input.birthdate) {
    const day = input.birthdate.day.trim();
    const month = input.birthdate.month.trim();
    const year = input.birthdate.year.trim();
    if (day && month && year) {
      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
  }

  return undefined;
}

export async function createProvisionedAccount(
  input: CreateProvisionedAccountInput,
): Promise<CreateProvisionedAccountResult> {
  const email = sanitizeEmail(input.email);
  const phoneNumber = sanitizePhone(input.phoneNumber);
  const firstname = input.firstname.trim();
  const lastname = input.lastname.trim();
  const birthDate = normalizeBirthDate(input);
  const countryName = input.countryName.trim();
  const countryCode = input.countryCode.trim().toUpperCase();
  const accountType = input.accountType;
  const roles = accountType === "announcer" ? ["User", "Announcer"] : ["User"];
  const metadata: Record<string, unknown> =
    accountType === "announcer"
      ? {
          becomeAnnouncerAt: new Date().toISOString(),
          becomeAnnouncerSource: "admin_dashboard",
        }
      : {};

  const existingByEmail = await findPlatformUserByEmailOrLogin(email);
  if (existingByEmail) {
    throw new Error("ACCOUNT_EMAIL_ALREADY_EXISTS");
  }

  const existingByPhone = await findPlatformUserByPhone(phoneNumber);
  if (existingByPhone) {
    throw new Error("ACCOUNT_PHONE_ALREADY_EXISTS");
  }

  const auth = getFirebaseAdminAuth();
  let createdUid: string | null = null;

  try {
    const authUser = await auth.createUser({
      email,
      password: input.password,
      emailVerified: true,
      displayName: `${firstname} ${lastname}`.trim(),
    });

    createdUid = authUser.uid;

    await createPlatformUserDocument({
      uid: authUser.uid,
      email,
      firstname,
      lastname,
      phoneNumber,
      countryName,
      countryCode,
      birthDate,
      roles,
      credits: input.credits ?? DEFAULT_CREDITS,
      metadata,
    });

    return {
      uid: authUser.uid,
      accountType,
      email,
      roles,
      emailVerified: true,
      phoneNumber,
    };
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (createdUid) {
      await auth.deleteUser(createdUid).catch(() => null);
    }

    if (code.includes("email-already-exists")) {
      throw new Error("ACCOUNT_EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function createListingForAnnouncer(
  input: CreateListingForAnnouncerInput,
): Promise<CreateListingForAnnouncerResult> {
  const announcerUid = input.announcerUid.trim();

  const announcer = await findPlatformUserByUid(announcerUid);
  if (!announcer) {
    throw new Error("ANNOUNCER_NOT_FOUND");
  }

  if (!hasAnnouncerRole(announcer.roles)) {
    throw new Error("ANNOUNCER_ROLE_REQUIRED");
  }

  const trimmedContact = (input.contact ?? "").trim();
  // Canonicalize an explicit manual contact too — the fallback to the
  // announcer's own phone is already compact E.164 (sanitizePhone/OTP/profile
  // completion all converge on that format).
  const contact = (trimmedContact ? normalizeGabonPhoneE164(trimmedContact) ?? trimmedContact : "") ||
    announcer.phoneNumbers[0] ||
    "";

  const propertyId = await createPropertyDocumentForAnnouncer({
    ...input,
    announcerUid,
    title: input.title.trim(),
    description: input.description.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    province: input.province.trim(),
    country: input.country.trim(),
    countryCode: input.countryCode.trim().toUpperCase(),
    additionnalInformation: input.additionnalInformation?.trim(),
    contact,
    sanitizedTags: sanitizeTags(input.tags),
  });

  return {
    propertyId,
    announcerUid,
    typeProperty: input.typeProperty,
    status: input.status,
    title: input.title.trim(),
  };
}
