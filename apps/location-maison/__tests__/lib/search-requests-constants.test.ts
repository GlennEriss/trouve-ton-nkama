import {
  SEARCH_REQUEST_BASE_FEE_XAF,
  SEARCH_REQUEST_BOOST_FEE_XAF,
  SEARCH_REQUEST_BOOST_DURATION_DAYS,
  SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH,
  computeSearchRequestAmountXaf,
} from '@/constantes/search-requests'

describe('tarification des demandes de recherche', () => {
  it('facture la seule redevance de base sans boost', () => {
    expect(computeSearchRequestAmountXaf(false)).toBe(SEARCH_REQUEST_BASE_FEE_XAF)
  })

  it('ajoute la redevance de boost quand il est demande', () => {
    expect(computeSearchRequestAmountXaf(true)).toBe(
      SEARCH_REQUEST_BASE_FEE_XAF + SEARCH_REQUEST_BOOST_FEE_XAF,
    )
  })

  it('rend le boost strictement plus cher que la publication simple', () => {
    expect(computeSearchRequestAmountXaf(true)).toBeGreaterThan(computeSearchRequestAmountXaf(false))
  })

  // Ces montants sont dupliques cote Cloud Functions
  // (functions/src/payments/search-requests/constants.ts) : les figer ici fait
  // echouer le test si un seul des deux cotes derive.
  it('fige les parametres economiques partages avec les Cloud Functions', () => {
    expect(SEARCH_REQUEST_BASE_FEE_XAF).toBe(500)
    expect(SEARCH_REQUEST_BOOST_FEE_XAF).toBe(1500)
    expect(SEARCH_REQUEST_BOOST_DURATION_DAYS).toBe(7)
    expect(SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH).toBe(1000)
  })
})
