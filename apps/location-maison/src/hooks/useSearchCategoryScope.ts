'use client'

import { useSearchParams } from 'next/navigation'

/**
 * `true` tant que la catégorie racine active (paramètre `category` de l'URL, piloté par
 * CategoryFilterPills) est l'immobilier ou "Toutes catégories" (vide — mélange tout, donc on
 * garde l'affichage complet plutôt que de cacher des filtres valides côté immobilier).
 *
 * Sert à masquer les sections de filtre qui n'ont aucun sens hors immobilier — Statut,
 * Surface (m²), Types d'annonces (typeProperty) n'existent tout simplement pas sur une
 * annonce Mode — et à réduire "Secteur recherché" à la Ville seule (Province/Quartier
 * cachés, voir SelectCityModeScope pour pourquoi Province ne peut pas piloter Ville pour
 * Mode). Demande directe d'un utilisateur qui a remarqué que les filtres de /search
 * n'étaient adaptés qu'à l'immobilier.
 */
export function useIsImmobilierSearchScope(): boolean {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') ?? ''
  return category === '' || category === 'Immobilier'
}
