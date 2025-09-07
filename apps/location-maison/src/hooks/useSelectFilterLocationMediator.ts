import { useMemo } from "react";
import { useFormContext, UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { SelectFilterLocationMediatorFactory } from "@/factories/mediator/SelectFilterLocationMediatorFactory";
import { SelectFilterLocationMediator } from "@/mediators/SelectFilterLocationMediator";
import { useProvinces } from "./use-provinces";
import { useCities } from "./use-cities";
import { useStreets } from "./use-streets";

export function useSelectFilterLocationMediator() {
    const form = useFormContext<FormFilterSchemaType>() as UseFormReturn<FormFilterSchemaType>;
    const { data: provinces, isLoading: provincesLoading } = useProvinces();
    const { data: cities, isLoading: citiesLoading } = useCities(provinces?.find(p => p.name === form.getValues('province'))?.id);
    const { data: streets, isLoading: streetsLoading } = useStreets(cities?.find(c => c.name === form.getValues('city'))?.id);

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
        streetsLoading
    };
}