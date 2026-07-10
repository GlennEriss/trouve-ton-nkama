import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  AdCampaign,
  AdCampaignStatus,
  Advertiser,
  CreateAdCampaignInput,
  CreateAdvertiserInput,
  ListAdCampaignsInput,
  ListAdCampaignsResult,
  ListAdvertisersResult,
  RecordPaymentInput,
  UpdateAdCampaignInput,
} from "@/modules/advertising/domain/types";
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

const ADVERTISERS_COLLECTION = COLLECTIONS.advertisers;
const AD_CAMPAIGNS_COLLECTION = COLLECTIONS.ad_campaigns;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybe.toDate === "function") return maybe.toDate().toISOString();
    if (typeof maybe.seconds === "number") return new Date(maybe.seconds * 1000).toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

function mapAdvertiser(id: string, data: Record<string, unknown>): Advertiser {
  return {
    id,
    name: String(data.name ?? ""),
    businessName: (data.businessName as string) ?? undefined,
    contactPhone: (data.contactPhone as string) ?? undefined,
    contactEmail: (data.contactEmail as string) ?? undefined,
    ownerUid: (data.ownerUid as string | null) ?? null,
    createdByAdminUid: (data.createdByAdminUid as string) ?? undefined,
    notes: (data.notes as string) ?? undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function toMillisRaw(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const maybe = value as { toMillis?: () => number; seconds?: number };
  if (typeof maybe?.toMillis === "function") return maybe.toMillis();
  if (typeof maybe?.seconds === "number") return maybe.seconds * 1000;
  return 0;
}

/** Statut effectif : une campagne dont la date de fin est passée est terminée. */
function effectiveStatus(rawStatus: AdCampaignStatus, endValue: unknown): AdCampaignStatus {
  const endMs = toMillisRaw(endValue);
  if ((rawStatus === "active" || rawStatus === "scheduled") && endMs > 0 && endMs < Date.now()) {
    return "ended";
  }
  return rawStatus;
}

function mapCampaign(id: string, data: Record<string, unknown>): AdCampaign {
  const billing = (data.billing as Record<string, unknown>) ?? {};
  const metrics = (data.metrics as Record<string, unknown>) ?? {};
  return {
    id,
    advertiserId: typeof data.advertiserId === "string" && data.advertiserId.trim() ? data.advertiserId : null,
    title: String(data.title ?? ""),
    creative: (data.creative as AdCampaign["creative"]) ?? { imageURL: "" },
    placements: (data.placements as AdCampaign["placements"]) ?? [],
    targeting: (data.targeting as AdCampaign["targeting"]) ?? null,
    startDate: toIso(data.startDate),
    endDate: toIso(data.endDate),
    status: effectiveStatus((data.status as AdCampaignStatus) ?? "draft", data.endDate),
    priority: typeof data.priority === "number" ? data.priority : 0,
    billing: {
      mode: (billing.mode as AdCampaign["billing"]["mode"]) ?? "admin_amount",
      amount: typeof billing.amount === "number" ? billing.amount : undefined,
      currency: (billing.currency as "XAF") ?? undefined,
      paymentMethod: (billing.paymentMethod as string) ?? undefined,
      paymentReference: (billing.paymentReference as string) ?? undefined,
      paidAt: toIso(billing.paidAt),
      paymentStatus: (billing.paymentStatus as AdCampaign["billing"]["paymentStatus"]) ?? "unpaid",
      creditsUsed: typeof billing.creditsUsed === "number" ? billing.creditsUsed : undefined,
    },
    createdByAdminUid: (data.createdByAdminUid as string) ?? undefined,
    metrics: {
      impressions: typeof metrics.impressions === "number" ? metrics.impressions : 0,
      clicks: typeof metrics.clicks === "number" ? metrics.clicks : 0,
    },
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** ===================== Advertisers ===================== */

export async function createAdvertiser(input: CreateAdvertiserInput): Promise<Advertiser> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(ADVERTISERS_COLLECTION).doc();
  const payload = {
    name: input.name,
    businessName: input.businessName ?? null,
    contactPhone: input.contactPhone ?? null,
    contactEmail: input.contactEmail ?? null,
    ownerUid: null,
    createdByAdminUid: input.actorUid,
    notes: input.notes ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  const snap = await ref.get();
  return mapAdvertiser(ref.id, snap.data() ?? {});
}

export async function listAdvertisers(): Promise<ListAdvertisersResult> {
  const db = getFirebaseAdminDb();
  const snap = await db
    .collection(ADVERTISERS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  const advertisers = snap.docs.map((d) => mapAdvertiser(d.id, d.data()));
  return { advertisers, count: advertisers.length };
}

/** ===================== Campaigns ===================== */

export async function createCampaign(input: CreateAdCampaignInput): Promise<AdCampaign> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(AD_CAMPAIGNS_COLLECTION).doc();
  await ref.set({
    advertiserId: input.advertiserId?.trim() || null,
    title: input.title,
    creative: input.creative,
    placements: input.placements,
    targeting: input.targeting ?? null,
    startDate: Timestamp.fromDate(new Date(input.startDate)),
    endDate: Timestamp.fromDate(new Date(input.endDate)),
    status: "draft" as AdCampaignStatus,
    priority: input.priority ?? 10,
    billing: { mode: "admin_amount", paymentStatus: "unpaid" },
    createdByAdminUid: input.actorUid,
    metrics: { impressions: 0, clicks: 0 },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return mapCampaign(ref.id, snap.data() ?? {});
}

export async function getCampaign(id: string): Promise<AdCampaign | null> {
  const db = getFirebaseAdminDb();
  const snap = await db.collection(AD_CAMPAIGNS_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return mapCampaign(snap.id, snap.data() ?? {});
}

export async function updateCampaign(input: UpdateAdCampaignInput): Promise<AdCampaign> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(AD_CAMPAIGNS_COLLECTION).doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("AD_CAMPAIGN_NOT_FOUND");

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.creative !== undefined) patch.creative = input.creative;
  if (input.placements !== undefined) patch.placements = input.placements;
  if (input.targeting !== undefined) patch.targeting = input.targeting;
  if (input.startDate !== undefined) patch.startDate = Timestamp.fromDate(new Date(input.startDate));
  if (input.endDate !== undefined) patch.endDate = Timestamp.fromDate(new Date(input.endDate));
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;

  await ref.update(patch);
  const updated = await ref.get();
  return mapCampaign(ref.id, updated.data() ?? {});
}

/** Publie une campagne : active si dans la fenêtre, sinon programmée. */
export async function publishCampaign(id: string): Promise<AdCampaign> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(AD_CAMPAIGNS_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("AD_CAMPAIGN_NOT_FOUND");

  const data = snap.data() ?? {};
  const now = Date.now();
  const startMs = (data.startDate as Timestamp | undefined)?.toMillis?.() ?? now;
  const endMs = (data.endDate as Timestamp | undefined)?.toMillis?.() ?? now;
  if (endMs < now) throw new Error("AD_CAMPAIGN_ALREADY_ENDED");

  const status: AdCampaignStatus = startMs > now ? "scheduled" : "active";
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return mapCampaign(ref.id, updated.data() ?? {});
}

/** Enregistre un paiement direct (concierge) en FCFA. */
export async function recordPayment(input: RecordPaymentInput): Promise<AdCampaign> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(AD_CAMPAIGNS_COLLECTION).doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("AD_CAMPAIGN_NOT_FOUND");

  await ref.set(
    {
      billing: {
        mode: "admin_amount",
        amount: input.amount,
        currency: input.currency ?? "XAF",
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference ?? null,
        paidAt: FieldValue.serverTimestamp(),
        paymentStatus: "paid",
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  const updated = await ref.get();
  return mapCampaign(ref.id, updated.data() ?? {});
}

export async function listCampaigns(input: ListAdCampaignsInput): Promise<ListAdCampaignsResult> {
  const db = getFirebaseAdminDb();
  // Requête simple (volume faible en V1) : on filtre/agrège en mémoire.
  const snap = await db
    .collection(AD_CAMPAIGNS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();

  // Persistance paresseuse : bascule en `ended` les campagnes expirées (best-effort).
  const expiredIds = snap.docs
    .filter((d) => {
      const data = d.data();
      const raw = (data.status as AdCampaignStatus) ?? "draft";
      return (raw === "active" || raw === "scheduled") && effectiveStatus(raw, data.endDate) === "ended";
    })
    .map((d) => d.id);
  if (expiredIds.length > 0) {
    try {
      const batch = db.batch();
      for (const id of expiredIds) {
        batch.update(db.collection(AD_CAMPAIGNS_COLLECTION).doc(id), {
          status: "ended",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch {
      // best-effort
    }
  }

  let campaigns = snap.docs.map((d) => mapCampaign(d.id, d.data()));

  if (input.status && input.status !== "all") {
    campaigns = campaigns.filter((c) => c.status === input.status);
  }
  if (input.placement && input.placement !== "all") {
    campaigns = campaigns.filter((c) => c.placements.includes(input.placement as never));
  }
  if (input.advertiserId) {
    campaigns = campaigns.filter((c) => c.advertiserId === input.advertiserId);
  }

  const summary = {
    active: campaigns.filter((c) => c.status === "active").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    pendingReview: campaigns.filter((c) => c.status === "pending_review").length,
    ended: campaigns.filter((c) => c.status === "ended").length,
    totalPaidAmount: campaigns.reduce(
      (sum, c) => sum + (c.billing.paymentStatus === "paid" ? c.billing.amount ?? 0 : 0),
      0,
    ),
  };

  return { campaigns, count: campaigns.length, summary };
}
