// src/factories/mediator/Step1MediatorFactory.ts
import { Step1FormPropertyMediator } from "@/mediators/Step1FormPropertyMediator";
import { UseFormReturn } from "react-hook-form";

export class Step1FormPropertyMediatorFactory {
  private static instance: Step1FormPropertyMediator | null = null;

  static create(form: UseFormReturn<any>): Step1FormPropertyMediator {
    if (!Step1FormPropertyMediatorFactory.instance) {
      Step1FormPropertyMediatorFactory.instance = new Step1FormPropertyMediator(form);
    }
    return Step1FormPropertyMediatorFactory.instance;
  }

  static getInstance(): Step1FormPropertyMediator {
    if (!Step1FormPropertyMediatorFactory.instance) {
      throw new Error("Step1FormPropertyMediator non initialisé. Utilisez create(form) d'abord.");
    }
    return Step1FormPropertyMediatorFactory.instance;
  }

  static reset(): void {
    Step1FormPropertyMediatorFactory.instance = null;
  }
}
