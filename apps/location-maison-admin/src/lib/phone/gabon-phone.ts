/**
 * Canonical Gabonese phone normalization, shared by every admin write path that
 * stores a phone number (Apify parsing, account provisioning, manual listing
 * edits, the one-shot backfill script). The stored/compared form is compact
 * E.164 — `+241XXXXXXXX`, no spaces — matching what the consumer app's
 * Firebase Phone Auth (OTP) and `phoneNumbers` array-contains lookups already
 * produce. This is the join key the announcer auto-attribution feature
 * (listing.contact == verified phone) depends on: a single canonical stored
 * format everywhere, in both apps' Firestore data.
 *
 * The current Gabon numbering plan uses 8 significant digits without the
 * historical leading 0 (066 57 54 67 → +241 66 57 54 67); both the legacy and
 * current forms are accepted and normalized to the same compact result.
 */

/** Extracts a Gabonese phone number anywhere in free text (optional +241 prefix, optional legacy leading 0, common groupings/separators). */
export const GABON_PHONE_RE = /(?:\+?241[\s.\-]?)?0?[1-9](?:[\s.\-]*\d){6,7}/;

/**
 * Normalize a Gabonese number to compact E.164 (`+241XXXXXXXX`). Returns null
 * when the digits don't resolve to a valid 8-digit national number (wrong
 * length, non-Gabonese, empty).
 */
export function normalizeGabonPhoneE164(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("241")) digits = digits.slice(3); // drop country code
  // Legacy 9-digit national number (0XX XX XX XX) → drop the leading 0.
  if (digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 8) {
    return null;
  }
  return `+241${digits}`;
}

/** Find and normalize the first Gabonese phone number in free text, if any. */
export function extractGabonPhoneE164(text: string): string | null {
  const match = text.match(GABON_PHONE_RE);
  return match ? normalizeGabonPhoneE164(match[0]) : null;
}
