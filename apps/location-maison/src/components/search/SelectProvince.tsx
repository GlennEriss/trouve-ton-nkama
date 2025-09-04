import React from 'react'
import { SelectFilterLocationMediatorFactory } from '@/factories/mediator/SelectFilterLocationMediatorFactory';
import { SelectFormApp } from '../shared/form/SelectFormApp';
import { useProvinces } from '@/hooks/use-provinces';

export default function SelectProvince() {
    const { data: provinces = [], isLoading: provincesLoading } = useProvinces();
    const mediator = SelectFilterLocationMediatorFactory.getInstance();
    mediator.setProvinces(provinces);
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
