import { useMemo } from "react";
import { useFormContext, UseFormReturn, useWatch } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { SelectFilterLocationMediatorFactory } from "@/factories/mediator/SelectFilterLocationMediatorFactory";
import { useProvinces } from "./use-provinces";
import { useCities } from "./use-cities";
import { useStreets } from "./use-streets";

export function useSelectFilterLocationMediator() {
    const form = useFormContext<FormFilterSchemaType>() as UseFormReturn<FormFilterSchemaType>;
    const selectedProvince = useWatch({ control: form.control, name: 'province' });
    const selectedCity = useWatch({ control: form.control, name: 'city' });

    const { data: provinces, isLoading: provincesLoading } = useProvinces();

    const selectedProvinceId = provinces?.find((province) => province.name === selectedProvince)?.id;
    const { data: cities, isLoading: citiesLoading } = useCities(selectedProvinceId);

    const selectedCityId = cities?.find((city) => city.name === selectedCity)?.id;
    const { data: streets, isLoading: streetsLoading } = useStreets(selectedCityId);

    const mediator = useMemo(() => {
        const mediator = SelectFilterLocationMediatorFactory.create(form);
        mediator.setProvinces(provinces || []);
        mediator.setCities(cities || []);
        mediator.setStreets(streets || []);
        return mediator;
    }, [form, provinces, cities, streets]);

    return {
        mediator,
        provincesLoading,
        citiesLoading,
        streetsLoading,
        selectedProvince: selectedProvince ?? '',
        selectedCity: selectedCity ?? ''
    };
}
