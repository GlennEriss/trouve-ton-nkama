import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useSelectFilterLocationMediator } from '@/hooks/useSelectFilterLocationMediator';

export default function SelectStreet() {
    const { mediator, streetsLoading } = useSelectFilterLocationMediator()
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
