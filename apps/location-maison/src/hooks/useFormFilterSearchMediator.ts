// src/hooks/useFormFilterSearchMediator.ts
import { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { useAlgoliaContext } from "@/providers/AlgoliaContext";
import { FormFilterMediatorFactory } from "@/factories/mediator/FormFilterMediatorFactory";
import { FORM_MANAGED_URL_PARAMS } from "@/mediators/FormFilterSearchMediator";
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
        // filtres immobilier — tout paramètre hors de ce formulaire (catégorie sélectionnée
        // via CategoryFilterPills/CategoryLeafFilterPills, filtres d'attributs Mode
        // attr_<key> via CategoryAttributeFilters) serait sinon effacé au premier submit.
        // On reporte donc toute clé de l'URL courante qui n'appartient PAS au formulaire
        // (FORM_MANAGED_URL_PARAMS) — un champ du formulaire explicitement vidé (ex.
        // minPrice effacé) ne doit jamais être réimporté depuis l'ancienne URL, d'où
        // l'exclusion par nom plutôt que par simple présence dans `params`.
        for (const [key, value] of searchParams.entries()) {
            if ((FORM_MANAGED_URL_PARAMS as readonly string[]).includes(key)) continue;
            params.set(key, value);
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
