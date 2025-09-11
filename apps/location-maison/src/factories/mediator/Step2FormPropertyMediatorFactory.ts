import { Step2FormPropertyMediator } from "@/mediators/Step2FormPropertyMediator";
import { UseFormReturn } from "react-hook-form";

export class Step2FormPropertyMediatorFactory {
    static create(form: UseFormReturn<any>) {
        return new Step2FormPropertyMediator(form);
    }
}