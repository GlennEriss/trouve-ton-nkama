/**
 * Normalizes a Facebook group URL into a dedup-friendly canonical form.
 * Pure function, no Firestore dependency — same spirit as apify-filter.service.ts.
 *
 * Handles the equivalent forms that come up when re-pasting a group link:
 * www./m./web. subdomains, trailing slash, query string (?ref=...), and
 * sub-paths (/buy_sell_discussion/, /about/). Does NOT resolve a group that
 * changed its vanity slug to its old one — that would require calling
 * Facebook, which isn't available for this use case (see apify module notes).
 */
export function normalizeFacebookGroupUrl(raw: string): { canonicalKey: string; canonicalUrl: string } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const isFacebookHost =
    hostname === "facebook.com" ||
    hostname === "www.facebook.com" ||
    hostname === "m.facebook.com" ||
    hostname === "web.facebook.com";
  if (!isFacebookHost) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2 || segments[0].toLowerCase() !== "groups") {
    return null;
  }

  const canonicalKey = segments[1].toLowerCase();
  if (!canonicalKey) {
    return null;
  }

  return { canonicalKey, canonicalUrl: `https://www.facebook.com/groups/${canonicalKey}` };
}
