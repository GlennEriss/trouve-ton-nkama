'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { SelectFormApp } from '../shared/form/SelectFormApp'
import { useAlgoliaAllCityOptions } from '@/hooks/useAlgoliaLocationOptions'
import type { FormFilterSchemaType } from '@/models/schema'

/**
 * Ville seule pour la catégorie Mode — pas de Province/Quartier (voir
 * useAlgoliaAllCityOptions pour pourquoi la cascade habituelle Province -> Ville ne peut pas
 * s'appliquer à Mode). Se lie au même champ `city` que SelectCity (immobilier) : le reste du
 * pipeline (useFormFilterSearchMediator, search-filter-query.ts) n'a pas besoin de savoir
 * laquelle des deux l'a rempli.
 */
export default function SelectCityModeScope() {
  const { control } = useFormContext<FormFilterSchemaType>()
  const { data: options = [], isLoading } = useAlgoliaAllCityOptions()

  return (
    <SelectFormApp
      control={control}
      id="city"
      name="city"
      label="Ville"
      options={options}
      placeholder={isLoading ? 'Chargement des villes...' : 'Sélectionnez une ville'}
      disabled={isLoading}
    />
  )
}
