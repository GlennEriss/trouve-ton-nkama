// src/hooks/useFormFilterSearchMediator.ts
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { FormFilterMediatorFactory } from "@/factories/mediator/FormFilterMediatorFactory";
import { useRouter } from 'next/navigation'

export function useFormFilterSearchMediator(form: UseFormReturn<FormFilterSchemaType>) {
    const router = useRouter();
    const algolia = useAlgoliaContext();

    const mediator = useMemo(() => {
        return FormFilterMediatorFactory.create(form, algolia);
    }, [form, algolia]);

    const onSubmit = (data: FormFilterSchemaType) => {
        const normalizedValues = mediator.normalizeValues(data);
        mediator.updateContext(data, normalizedValues);

        const params = mediator.buildUrlParams(data, normalizedValues);
        router.push(`/search?${params.toString()}`);
    };
    const onClear = () => {
        mediator.resetForm();
        router.replace('/search');
    };
    return {
        onSubmit,
        onClear,
        mediator
    };
}
