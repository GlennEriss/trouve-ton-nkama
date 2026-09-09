import { apiFetch } from './client';

// Même régie pub first-party que le web (voir apps/location-maison/src/models/advertising.d.ts
// et HomeHeroSponsoredSwap.tsx, qui n'existe aujourd'hui que sur le hero desktop) — le mobile
// consomme le même backend/la même donnée, pas un système de pub inventé pour l'app.
export type AdCreative = {
  campaignId: string;
  placement: string;
  imageURL?: string;
  videoURL?: string;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export async function getActiveHomeAds(): Promise<AdCreative[]> {
  const data = await apiFetch<{ creatives: AdCreative[] }>('/api/advertising/active?placement=home&all=1');
  return data.creatives ?? [];
}

type AdTrackEvent = 'impression' | 'click';

// Best-effort comme côté web (ad-tracking.client.ts) : ne doit jamais faire échouer l'affichage
// de la pub elle-même si le tracking échoue. Pas de visitorId persistant contrairement au web
// (qui utilise localStorage) — AsyncStorage n'est pas encore une dépendance du projet mobile et
// l'ajouter déclencherait un nouveau rebuild natif complet pour ce seul besoin secondaire ; un id
// généré par session suffit pour la dédup côté serveur pendant la durée de l'app ouverte.
let sessionVisitorId: string | null = null;
function getSessionVisitorId(): string {
  if (!sessionVisitorId) {
    sessionVisitorId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return sessionVisitorId;
}

export async function trackAdEvent(event: AdTrackEvent, campaignId: string, placementKey: string): Promise<void> {
  try {
    await apiFetch('/api/advertising/track', {
      method: 'POST',
      body: { event, campaignId, placementKey, visitorId: getSessionVisitorId() },
    });
  } catch {
    // best-effort, voir commentaire ci-dessus.
  }
}
