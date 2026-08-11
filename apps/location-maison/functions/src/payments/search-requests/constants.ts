// Paramètres économiques des demandes de recherche (voir aussi
// apps/location-maison/src/constantes/search-requests.ts, copie côté app pour
// l'UX/validation — même convention de duplication que gifts/constants.ts).

export const SEARCH_REQUEST_BASE_FEE_XAF = 500
export const SEARCH_REQUEST_BOOST_FEE_XAF = 1500
export const SEARCH_REQUEST_BOOST_DURATION_DAYS = 7
export const SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH = 1000

// Anti-spam : nombre max de demandes `pending_confirmation` initiables par
// numéro de téléphone payeur sur une fenêtre glissante d'une heure — même
// garde que GIFT_MAX_PENDING_PER_PHONE_PER_HOUR.
export const SEARCH_REQUEST_MAX_PENDING_PER_PHONE_PER_HOUR = 5

export function computeSearchRequestAmountXaf(boostRequested: boolean): number {
  return boostRequested
    ? SEARCH_REQUEST_BASE_FEE_XAF + SEARCH_REQUEST_BOOST_FEE_XAF
    : SEARCH_REQUEST_BASE_FEE_XAF
}
