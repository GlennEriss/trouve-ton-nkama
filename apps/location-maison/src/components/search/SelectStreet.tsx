import React from 'react'
import { SelectFilterLocationMediatorFactory } from '@/factories/mediator/SelectFilterLocationMediatorFactory';
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useStreets } from '@/hooks/use-streets';

export default function SelectStreet() {
    const mediator = SelectFilterLocationMediatorFactory.getInstance();
    const { data: streets = [], isLoading: streetsLoading } = useStreets(
        mediator.getForm().getValues('city') ? mediator.getCities().find(c => c.name === mediator.getForm().getValues('city'))?.id : undefined
    );
    mediator.setStreets(streets);
    return (
        <SelectFormApp
            control={mediator.getForm().control}
            id="street"
            name="street"
            label="Quartier"
            options={mediator.getStreetOptions()}
            placeholder="Sélectionnez un quartier"
            disabled={streetsLoading || !mediator.getForm().getValues('city')}
            onValueChange={mediator.onStreetChange}
        />
    )
}
