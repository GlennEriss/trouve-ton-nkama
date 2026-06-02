import { useMemo } from "react";
import { useFormContext, UseFormReturn, useWatch } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { SelectFilterLocationMediatorFactory } from "@/factories/mediator/SelectFilterLocationMediatorFactory";
import {
    useAlgoliaProvinceOptions,
    useAlgoliaCityOptions,
    useAlgoliaStreetOptions,
} from "./useAlgoliaLocationOptions";

export function useSelectFilterLocationMediator() {
    const form = useFormContext<FormFilterSchemaType>() as UseFormReturn<FormFilterSchemaType>;
    const selectedProvince = useWatch({ control: form.control, name: 'province' });
    const selectedCity = useWatch({ control: form.control, name: 'city' });

    const { data: provinceOptions = [], isLoading: provincesLoading } = useAlgoliaProvinceOptions();
    const { data: cityOptions = [], isLoading: citiesLoading } = useAlgoliaCityOptions(selectedProvince);
    const { data: streetOptions = [], isLoading: streetsLoading } = useAlgoliaStreetOptions(selectedProvince, selectedCity);

    const mediator = useMemo(() => {
        const mediator = SelectFilterLocationMediatorFactory.create(form);
        mediator.setProvinces(provinceOptions.map(o => ({ id: o.value, name: o.value, state: 'IN_PROGRESS', country: '' }) as any));
        mediator.setCities(cityOptions.map(o => ({ id: o.value, name: o.value, state: 'IN_PROGRESS', country: '' }) as any));
        mediator.setStreets(streetOptions.map(o => ({ id: o.value, name: o.value, state: 'IN_PROGRESS', country: '' }) as any));
        return mediator;
    }, [form, provinceOptions, cityOptions, streetOptions]);

    return {
        mediator,
        provincesLoading,
        citiesLoading,
        streetsLoading,
        selectedProvince: selectedProvince ?? '',
        selectedCity: selectedCity ?? ''
    };
}
