// src/hooks/useStep3FormPropertyMediator.ts
import { useMemo } from "react";
import { useFormContext, UseFormReturn } from "react-hook-form";
import { Step3FormPropertyMediatorFactory } from "@/factories/mediator/Step3FormPropertyMediatorFactory";
import { Step3FormPropertyMediator } from "@/mediators/Step3FormPropertyMediator";

export function useStep3FormPropertyMediator(): Step3FormPropertyMediator {
    const form = useFormContext() as UseFormReturn<any>;
    return useMemo(() => Step3FormPropertyMediatorFactory.create(form), [form]);
}
