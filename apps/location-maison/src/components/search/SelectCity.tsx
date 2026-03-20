import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useSelectFilterLocationMediator } from '@/hooks/useSelectFilterLocationMediator';

export default function SelectCity() {
    const { mediator, citiesLoading, selectedProvince } = useSelectFilterLocationMediator()
    return (
        <SelectFormApp
            control={mediator.getForm().control}
            id="city"
            name="city"
            label="Ville"
            options={mediator.getCityOptions()}
            placeholder={citiesLoading ? "Chargement des villes..." : "Sélectionnez une ville"}
            disabled={citiesLoading || !selectedProvince}
            onValueChange={mediator.onCityChange}
        />
  )
}
