/**
 * Phone (OTP passwordless) authentication — backend.
 *
 * The client signs in with Firebase Phone Auth (`signInWithPhoneNumber`) and
 * obtains a Firebase ID token. This service verifies that token server-side
 * (Firebase Admin) and resolves — or provisions — the matching Firestore user.
 *
 * Product rules (cf. project decisions):
 * - Passwordless: no password is ever set for phone accounts.
 * - A phone signup is an **announcer** → roles `['User', 'Announcer']`.
 * - Email is optional (never required for phone accounts).
 * - Account linking (option A): if the verified number already belongs to an
 *   existing account (email/Google/…), we attach the `PHONE` provider to that
 *   account instead of creating a duplicate. Resolution is uid → phone, and the
 *   app's session layer keys on the NextAuth uid (see resolveAuthenticatedUid),
 *   so returning the existing doc keeps the session consistent.
 * - Auto-attribution (Lot 4b): every successful phone sign-in reconciles
 *   listings whose `contact` matches the verified number to this account —
 *   best-effort, never blocks the sign-in itself.
 */

import { Timestamp } from "firebase/firestore";

import { adminAuth } from "@/firebase/admin";
import { createLogger } from "@/lib/logger";
import type { Role, User } from "@/models/authentication";

import { claimListingsByVerifiedPhone } from "@/features/announcer/listing-claim/services/listing-claim.service";

import { userRepository } from "../repositories/user.repository";
import { resolveSessionUser } from "./resolve-session-user";

const logger = createLogger("auth.phone-auth.service");

export type PhoneAuthErrorCode = "INVALID_TOKEN" | "MISSING_PHONE" | "PERSISTENCE_ERROR";

export class PhoneAuthError extends Error {
  constructor(
    public readonly code: PhoneAuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PhoneAuthError";
  }
}

/**
 * Verify a Firebase phone ID token and return the backing Firestore user,
 * creating a minimal announcer account on first sign-in.
 */
export async function authenticateWithPhoneIdToken(idToken: string): Promise<User> {
  let uid: string;
  let phone: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    phone = decoded.phone_number;
  } catch (error) {
    logger.warn("Phone ID token verification failed", { error });
    throw new PhoneAuthError("INVALID_TOKEN", "Jeton téléphone invalide ou expiré.");
  }

  if (!phone) {
    throw new PhoneAuthError("MISSING_PHONE", "Numéro de téléphone absent du jeton d'authentification.");
  }

  // Existing account by Firebase uid, else by phone (account linking, option A).
  const existing = await resolveSessionUser({ uid, phone });
  let resolvedUser = existing ? await ensurePhoneProvider(existing) : await createMinimalPhoneUser(uid, phone);

  // Auto-attribution (Lot 4b): best-effort, never blocks sign-in. On a
  // successful claim, persist a one-shot notice so the announcer's dashboard
  // can welcome them ("N annonces vous ont été rattachées") — see
  // AutoClaimBanner / the dismiss route, which clears this flag once shown.
  try {
    const { claimedCount } = await claimListingsByVerifiedPhone(resolvedUser.uid, phone);
    if (claimedCount > 0) {
      resolvedUser = await userRepository.update(resolvedUser.uid, {
        metadata: {
          ...resolvedUser.metadata,
          pendingClaimNotice: { count: claimedCount, claimedAt: new Date().toISOString() },
        },
      });
    }
  } catch (error) {
    logger.warn("Auto-claim of listings by verified phone failed", { uid: resolvedUser.uid, error });
  }

  return resolvedUser;
}

/** Attach the PHONE provider + verified flag to an existing account if missing. */
async function ensurePhoneProvider(user: User): Promise<User> {
  const providers = Array.isArray(user.providers) ? user.providers : [];
  const alreadyLinked = providers.includes("PHONE");

  if (alreadyLinked && user.phoneNumberVerified) {
    return user;
  }

  const nextProviders = alreadyLinked ? providers : [...providers, "PHONE" as const];
  try {
    return await userRepository.update(user.uid, {
      providers: nextProviders,
      phoneNumberVerified: true,
    });
  } catch (error) {
    logger.error("Failed to link PHONE provider to existing user", { uid: user.uid, error });
    throw new PhoneAuthError("PERSISTENCE_ERROR", "Impossible de lier ce numéro à votre compte.");
  }
}

/**
 * Create a minimal passwordless announcer account. The profile is intentionally
 * incomplete (`needsProfileCompletion`) so the existing middleware redirects to
 * `/complete-profile`.
 */
async function createMinimalPhoneUser(uid: string, phone: string): Promise<User> {
  const now = Timestamp.now();
  const user = {
    uid,
    login: phone,
    firstname: "",
    lastname: "",
    email: null,
    phoneNumbers: [phone],
    phoneNumberVerified: true,
    // Phone signup ⇒ announcer, but announcers carry the User role too.
    roles: ["User", "Announcer"] as Role[],
    emailVerified: false,
    providers: ["PHONE"],
    metadata: { needsProfileCompletion: true },
    favoris: [],
    credits: 3,
    state: "IN_PROGRESS",
    createdAt: now,
    updatedAt: now,
  } as User;

  try {
    return await userRepository.create(user);
  } catch (error) {
    logger.error("Failed to create minimal phone user", { uid, error });
    throw new PhoneAuthError("PERSISTENCE_ERROR", "Impossible de créer le compte téléphone.");
  }
}
