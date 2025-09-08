// src/factories/mediator/Step1MediatorFactory.ts
import { Step1FormPropertyMediator } from "@/mediators/Step1FormPropertyMediator";
import { UseFormReturn } from "react-hook-form";

export class Step1FormPropertyMediatorFactory {
  // Plus de singleton: on renvoie une nouvelle instance liée au form courant
  static create(form: UseFormReturn<any>): Step1FormPropertyMediator {
    return new Step1FormPropertyMediator(form);
  }
}
