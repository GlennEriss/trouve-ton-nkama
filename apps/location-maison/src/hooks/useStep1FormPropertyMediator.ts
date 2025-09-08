// src/hooks/useStep1FormPropertyMediator.ts
import { useFormContext, UseFormReturn } from "react-hook-form";
import { useMemo } from "react";
import { Step1FormPropertyMediatorFactory } from "@/factories/mediator/Step1FormPropertyMediatorFactory";
import { Step1FormPropertyMediator } from "@/mediators/Step1FormPropertyMediator";

export function useStep1FormPropertyMediator(): Step1FormPropertyMediator {
    const form = useFormContext() as UseFormReturn<any>;
    // Memoize per form instance to avoid unnecessary re-instantiations
    return useMemo(() => Step1FormPropertyMediatorFactory.create(form), [form]);
}