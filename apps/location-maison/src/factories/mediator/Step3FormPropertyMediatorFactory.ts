// src/factories/mediator/Step3FormPropertyMediatorFactory.ts
import { UseFormReturn } from "react-hook-form";
import { Step3FormPropertyMediator } from "@/mediators/Step3FormPropertyMediator";

export class Step3FormPropertyMediatorFactory {
  static create(form: UseFormReturn<any>): Step3FormPropertyMediator {
    return new Step3FormPropertyMediator(form);
  }
}
