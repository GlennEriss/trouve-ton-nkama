// src/core/FilterMediatorFactory.ts
import { UseFormReturn } from "react-hook-form";
import { FormFilterSchemaType } from "@/models/schema";
import { SelectFilterLocationMediator } from "@/mediators/SelectFilterLocationMediator";

export class SelectFilterLocationMediatorFactory {
  // Plus de singleton: toujours créer une nouvelle instance liée au form courant
  static create(form: UseFormReturn<FormFilterSchemaType>): SelectFilterLocationMediator {
    return new SelectFilterLocationMediator(form);
  }
}
