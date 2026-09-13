'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type RecommendationRequestContextValue = {
  recommendationRequestId: string
  rankingVariant: string
  rankingVersion: string
}

const RecommendationRequestContext = createContext<RecommendationRequestContextValue | null>(null)

// Scope une requête de recommandation servie (un recommendationRequestId + sa variante/version)
// à une liste rendue (une page de résultats, une section de l'accueil), pour que
// ListingCard/ButtonFavoris/ContactSection puissent émettre des events corrélés sans
// prop-drilling. Absent (valeur null) hors des surfaces MVP (accueil/recherche) : tout
// consommateur doit se comporter en no-op dans ce cas.
export function RecommendationRequestProvider({
  value,
  children,
}: {
  value: RecommendationRequestContextValue | null
  children: ReactNode
}) {
  return (
    <RecommendationRequestContext.Provider value={value}>
      {children}
    </RecommendationRequestContext.Provider>
  )
}

export function useRecommendationRequestContext(): RecommendationRequestContextValue | null {
  return useContext(RecommendationRequestContext)
}

export type RecommendationCardContextValue = RecommendationRequestContextValue & {
  listingId: string
  position: number
}

const RecommendationCardContext = createContext<RecommendationCardContextValue | null>(null)

// Contexte imbriqué, établi par ListingCard autour de sa propre sous-arborescence : porte en
// plus le listingId/position de CETTE carte, pour que ButtonFavoris/ContactSection (rendus à
// l'intérieur) puissent émettre un event recommandation corrélé sans le recevoir en prop.
export function RecommendationCardProvider({
  value,
  children,
}: {
  value: RecommendationCardContextValue | null
  children: ReactNode
}) {
  return (
    <RecommendationCardContext.Provider value={value}>{children}</RecommendationCardContext.Provider>
  )
}

export function useRecommendationCardContext(): RecommendationCardContextValue | null {
  return useContext(RecommendationCardContext)
}
