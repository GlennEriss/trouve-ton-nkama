// src/hooks/useFormFilterSearchMediator.ts
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { FormFilterMediatorFactory } from "@/factories/mediator/FormFilterMediatorFactory";
import { useRouter, useSearchParams } from 'next/navigation'

export function useFormFilterSearchMediator(form: UseFormReturn<FormFilterSchemaType>) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const algolia = useAlgoliaContext();

    const mediator = useMemo(() => {
        return FormFilterMediatorFactory.create(form, algolia);
    }, [form, algolia]);

    const onSubmit = (data: FormFilterSchemaType) => {
        const normalizedValues = mediator.normalizeValues(data);
        mediator.updateContext(data, normalizedValues);

        const params = mediator.buildUrlParams(data, normalizedValues);
        // buildUrlParams reconstruit l'URL depuis les seuls champs du formulaire de
        // filtres immobilier — la catégorie sélectionnée via CategoryFilterPills (Lot 4)
        // n'en fait pas partie et serait sinon effacée à chaque soumission du formulaire.
        const category = searchParams.get('category');
        if (category) {
            params.set('category', category);
        }
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
