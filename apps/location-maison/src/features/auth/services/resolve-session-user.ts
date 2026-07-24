/**
 * Provider-agnostic resolution of the Firestore user backing a session.
 *
 * Historically the NextAuth callbacks keyed on the email (`findByEmail`), which
 * breaks for accounts that have no email — notably phone-OTP (passwordless)
 * accounts. This helper resolves by priority **uid → phone → email** so every
 * provider (Google, Facebook, Credentials, Phone) hydrates the same way.
 *
 * Lookups propagate repository errors (fail-closed) to preserve the existing
 * callback behavior, where a lookup failure is caught by the caller and aborts
 * sign-in rather than being mistaken for "no user".
 */

import { userRepository } from "../repositories/user.repository";
import type { User } from "@/models/authentication";

export type SessionUserIdentity = {
  uid?: string | null;
  phone?: string | null;
  email?: string | null;
};

export async function resolveSessionUser(identity: SessionUserIdentity): Promise<User | null> {
  const { uid, phone, email } = identity;

  if (uid) {
    const byUid = await userRepository.findById(uid);
    if (byUid) return byUid;
  }

  if (phone) {
    const byPhone = await userRepository.findByPhoneNumber(phone);
    if (byPhone) return byPhone;
  }

  if (email) {
    const byEmail = await userRepository.findByEmail(email);
    if (byEmail) return byEmail;
  }

  return null;
}

/** Extract identity fields from a NextAuth `user` object of any provider shape. */
export function toSessionUserIdentity(user: unknown): SessionUserIdentity {
  const candidate = (user ?? {}) as Record<string, unknown>;
  const phoneNumbers = candidate.phoneNumbers;
  const phoneFromArray = Array.isArray(phoneNumbers)
    ? (phoneNumbers.find((value) => typeof value === "string" && value.trim() !== "") as string | undefined)
    : undefined;

  return {
    // Our Firestore uid (Credentials/Phone providers) — falls back to the
    // NextAuth `id` (an OAuth provider sub, which simply won't match a doc).
    uid: (typeof candidate.uid === "string" ? candidate.uid : undefined) ??
      (typeof candidate.id === "string" ? candidate.id : undefined) ??
      null,
    phone: phoneFromArray ??
      (typeof candidate.phoneNumber === "string" ? candidate.phoneNumber : undefined) ??
      null,
    email: typeof candidate.email === "string" ? candidate.email : null,
  };
}
