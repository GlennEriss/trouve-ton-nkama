// src/factories/FormFilterMediatorFactory.ts
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { FormFilterSearchMediator } from "@/mediators/FormFilterSearchMediator";

export class FormFilterMediatorFactory {
  private static instance: FormFilterSearchMediator | null = null;

  static create(
    form: UseFormReturn<FormFilterSchemaType>,
    algolia: ConstructorParameters<typeof FormFilterSearchMediator>[1]
  ): FormFilterSearchMediator {
    if (!FormFilterMediatorFactory.instance || !form) {
      FormFilterMediatorFactory.instance = new FormFilterSearchMediator(form, algolia);
    }
    return FormFilterMediatorFactory.instance;
  }

  static getInstance(): FormFilterSearchMediator {
    if (!FormFilterMediatorFactory.instance) {
      throw new Error("FormFilterMediator non créé. Utilise FormFilterMediatorFactory.create d'abord.");
    }
    return FormFilterMediatorFactory.instance;
  }

  static reset() {
    FormFilterMediatorFactory.instance = null;
  }
}
