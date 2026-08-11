/**
 * @module constantes
 *
 * Paramètres économiques des demandes de recherche côté app (UX/validation).
 * Les mêmes montants sont dupliqués côté Cloud Functions
 * (functions/src/payments/search-requests/constants.ts) — même convention que gifts.ts.
 */

export const SEARCH_REQUEST_BASE_FEE_XAF = 500
export const SEARCH_REQUEST_BOOST_FEE_XAF = 1500
export const SEARCH_REQUEST_BOOST_DURATION_DAYS = 7
export const SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH = 1000

/** Montant total à payer selon que le boost est demandé ou non. */
export function computeSearchRequestAmountXaf(boostRequested: boolean): number {
  return boostRequested
    ? SEARCH_REQUEST_BASE_FEE_XAF + SEARCH_REQUEST_BOOST_FEE_XAF
    : SEARCH_REQUEST_BASE_FEE_XAF
}
