import {
  AD_PLACEMENTS,
  type AdCampaign,
  type Advertiser,
  type CreateAdCampaignInput,
  type CreateAdvertiserInput,
  type ListAdCampaignsInput,
  type ListAdCampaignsResult,
  type ListAdvertisersResult,
  type RecordPaymentInput,
  type UpdateAdCampaignInput,
} from "@/modules/advertising/domain/types";
import * as repo from "@/modules/advertising/infrastructure/advertising.repository";

function assertValidDates(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error("AD_CAMPAIGN_INVALID_DATES");
  if (end <= start) throw new Error("AD_CAMPAIGN_END_BEFORE_START");
}

function assertValidPlacements(placements: string[]) {
  if (!placements.length) throw new Error("AD_CAMPAIGN_NO_PLACEMENT");
  for (const p of placements) {
    if (!AD_PLACEMENTS.includes(p as never)) throw new Error("AD_CAMPAIGN_INVALID_PLACEMENT");
  }
}

/** ===================== Advertisers ===================== */

export async function createAdvertiser(input: CreateAdvertiserInput): Promise<Advertiser> {
  if (!input.name?.trim()) throw new Error("ADVERTISER_INVALID_NAME");
  return repo.createAdvertiser(input);
}

export async function listAdvertisers(): Promise<ListAdvertisersResult> {
  return repo.listAdvertisers();
}

/** ===================== Campaigns ===================== */

export async function createCampaign(input: CreateAdCampaignInput): Promise<AdCampaign> {
  if (!input.advertiserId) throw new Error("AD_CAMPAIGN_ADVERTISER_REQUIRED");
  if (!input.title?.trim()) throw new Error("AD_CAMPAIGN_INVALID_TITLE");
  if (!input.creative?.imageURL?.trim()) throw new Error("AD_CAMPAIGN_INVALID_CREATIVE");
  assertValidPlacements(input.placements);
  assertValidDates(input.startDate, input.endDate);
  return repo.createCampaign(input);
}

export async function listCampaigns(input: ListAdCampaignsInput): Promise<ListAdCampaignsResult> {
  return repo.listCampaigns(input);
}

export async function getCampaign(id: string): Promise<AdCampaign | null> {
  return repo.getCampaign(id);
}

export async function updateCampaign(input: UpdateAdCampaignInput): Promise<AdCampaign> {
  if (input.placements) assertValidPlacements(input.placements);
  if (input.startDate && input.endDate) assertValidDates(input.startDate, input.endDate);
  return repo.updateCampaign(input);
}

export async function publishCampaign(id: string): Promise<AdCampaign> {
  return repo.publishCampaign(id);
}

export async function recordPayment(input: RecordPaymentInput): Promise<AdCampaign> {
  if (!(input.amount > 0)) throw new Error("AD_PAYMENT_INVALID_AMOUNT");
  if (!input.paymentMethod?.trim()) throw new Error("AD_PAYMENT_INVALID_METHOD");
  return repo.recordPayment(input);
}
