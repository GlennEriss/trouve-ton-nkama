import React from 'react'
import { SelectFilterLocationMediatorFactory } from '@/factories/mediator/SelectFilterLocationMediatorFactory';
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useCities } from '@/hooks/use-cities';

export default function SelectCity() {
    const mediator = SelectFilterLocationMediatorFactory.getInstance();
    const { data: cities = [], isLoading: citiesLoading } = useCities(
        mediator.getForm().getValues('province') ? mediator.getProvinces().find(p => p.name === mediator.getForm().getValues('province'))?.id : undefined
    );
    mediator.setCities(cities);
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
