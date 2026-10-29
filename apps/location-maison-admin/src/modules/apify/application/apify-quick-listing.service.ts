import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import { normalizeGabonPhoneE164 } from "@/lib/phone/gabon-phone";
import { getAnnouncerUserByUid } from "@/modules/announcer-management/infrastructure/announcer.repository";

// Same public contract as quick listings: text, location and a mobile contact.
// Never synthesize a contact from the account used for administrative attribution.
const schema = z.object({
  description: z.string().trim().min(10).max(3000),
  province: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  neighborhood: z.string().trim().max(120),
  contactPhone: z.string().regex(/^\+241[67]\d{7}$/),
});

export async function createApifyQuickListing(draft: Record<string, unknown>, announcerUid: string, adminUid: string) {
  const parsed = schema.safeParse({
    description: draft.description, province: draft.province, city: draft.city,
    neighborhood: draft.street ?? "",
    contactPhone: typeof draft.contact === "string" ? normalizeGabonPhoneE164(draft.contact) : null,
  });
  if (!parsed.success) {
    throw new Error(`Annonce rapide : corriger ${[...new Set(parsed.error.issues.map(issue => issue.path.join(".")))].join(", ")}.`);
  }
  if (!await getAnnouncerUserByUid(announcerUid)) throw new Error("Annonceur introuvable ou rôle annonceur manquant.");

  const source = draft.source && typeof draft.source === "object" ? draft.source as Record<string, unknown> : {};
  const text = typeof source.rawText === "string" && source.rawText.trim() ? source.rawText.trim() : parsed.data.description;
  // Stable across batch retries, review edits and changes of attribution account.
  // Author URLs are not post permalinks: use original text too, never URL alone.
  const fingerprint = createHash("sha256").update(JSON.stringify([
    typeof source.authorId === "string" ? source.authorId : "",
    text.normalize("NFC").replace(/\s+/g, " "),
  ])).digest("hex");
  const db = getFirebaseAdminDb();
  const ref = db.collection("quick_listings").doc(`apify-${fingerprint}`);
  return db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) return { quickListingId: ref.id, alreadyExists: true };
    const now = FieldValue.serverTimestamp();
    tx.create(ref, {
      ...parsed.data, paymentStatus: "not_required", moderationStatus: "APPROVED",
      state: "IN_PROGRESS", createdAt: now, updatedAt: now, publishedAt: now,
    });
    // Private administrative attribution/provenance; no fake payment or debit.
    tx.create(db.collection("quick_listing_moderation").doc(ref.id), {
      reviewedBy: adminUid, reviewedAt: now, decision: "APPROVED", announcerUid,
      reason: "Import Apify validé par un administrateur — sans photo.",
      paymentExemption: "admin_apify_import", fingerprint,
      source: { rawText: text, postUrl: typeof source.postUrl === "string" ? source.postUrl : null },
    });
    return { quickListingId: ref.id, alreadyExists: false };
  });
}
