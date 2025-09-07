import React from 'react'
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useSelectFilterLocationMediator } from '@/hooks/useSelectFilterLocationMediator';

export default function SelectProvince() {
    const { mediator, provincesLoading } = useSelectFilterLocationMediator()
    return (
        <SelectFormApp
            control={mediator.getForm().control}
            id="province"
            name="province"
            label="Province"
            options={mediator.getProvinceOptions()}
            placeholder="Sélectionnez une province"
            disabled={provincesLoading}
        />
    )
}
