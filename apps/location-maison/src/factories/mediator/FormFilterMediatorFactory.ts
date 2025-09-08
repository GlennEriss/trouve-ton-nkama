// src/factories/FormFilterMediatorFactory.ts
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { FormFilterSearchMediator } from "@/mediators/FormFilterSearchMediator";

export class FormFilterMediatorFactory {
  // Plus de singleton: renvoie une nouvelle instance liée aux dépendances courantes
  static create(
    form: UseFormReturn<FormFilterSchemaType>,
    algolia: ConstructorParameters<typeof FormFilterSearchMediator>[1]
  ): FormFilterSearchMediator {
    return new FormFilterSearchMediator(form, algolia);
  }
}
