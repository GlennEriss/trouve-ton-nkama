// src/core/FilterMediatorFactory.ts
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { SelectFilterLocationMediator } from "@/mediators/SelectFilterLocationMediator";

export class SelectFilterLocationMediatorFactory {
  private static instance: SelectFilterLocationMediator | null = null;

  static create(form: UseFormReturn<FormFilterSchemaType>): SelectFilterLocationMediator {
    if (!SelectFilterLocationMediatorFactory.instance) {
      SelectFilterLocationMediatorFactory.instance = new SelectFilterLocationMediator(form);
    }
    return SelectFilterLocationMediatorFactory.instance;
  }

  static getInstance(): SelectFilterLocationMediator {
    if (!SelectFilterLocationMediatorFactory.instance) {
      throw new Error(
        "FilterMediator non créé. Utiliser d'abord FilterMediatorFactory.create(form)."
      );
    }
    return SelectFilterLocationMediatorFactory.instance;
  }

  static reset(): void {
    SelectFilterLocationMediatorFactory.instance = null;
  }
}
