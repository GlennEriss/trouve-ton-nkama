// Union des collections Firestore utilisées par apps/location-maison et
// apps/location-maison-admin. Source unique pour éviter les redéclarations locales
// (ex: "properties"/"users" étaient redéclarés dans 4+ fichiers admin avant cet extrait).
const COLLECTIONS = {
  // Partagées entre les deux apps
  users: "users",
  properties: "properties",
  credit_transactions: "credit_transactions",
  notifications: "notifications",
  advertisers: "advertisers",
  ad_campaigns: "ad_campaigns",
  reels: "reels",
  gift_transactions: "gift_transactions",
  gift_withdrawals: "gift_withdrawals",
  idempotency_keys: "idempotency_keys",
  search_requests: "search_requests",
  // Written by location-maison (listing-claim.service.ts) when an
  // auto-attribution batch exceeds MAX_AUTO_CLAIM; reviewed/resolved from
  // location-maison-admin.
  listing_claim_reviews: "listing_claim_reviews",

  // location-maison uniquement
  ai_search_sessions: "ai_search_sessions",
  ai_search_turns: "ai_search_turns",
  provinces: "provinces",
  cities: "cities",
  streets: "streets",
  property_statistics: "property_statistics",
  ad_serving_counters: "ad_serving_counters",

  // location-maison-admin uniquement
  audit_logs: "audit_logs",
  refund_payments: "refund_payments",
  credit_packs: "credit_packs",
  listing_moderation_decisions: "listing_moderation_decisions",
  listing_duplicate_settings: "listing_duplicate_settings",
  listing_similarity_metrics_daily: "listing_similarity_metrics_daily",
  announcer_import_sources: "announcer_import_sources",
  social_import_jobs: "social_import_jobs",
  social_import_candidates: "social_import_candidates",
  social_import_decisions: "social_import_decisions",
  social_import_settings: "social_import_settings",
} as const;

export default COLLECTIONS;
