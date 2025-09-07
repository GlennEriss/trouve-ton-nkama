import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useSelectFilterLocationMediator } from '@/hooks/useSelectFilterLocationMediator';

export default function SelectCity() {
    const { mediator, citiesLoading } = useSelectFilterLocationMediator()
    return (
        <SelectFormApp
            control={mediator.getForm().control}
            id="city"
            name="city"
            label="Ville"
            options={mediator.getCityOptions()}
            placeholder="Sélectionnez une ville"
            disabled={citiesLoading || !mediator.getForm().getValues('province')}
            onValueChange={mediator.onCityChange}
        />
  )
}
