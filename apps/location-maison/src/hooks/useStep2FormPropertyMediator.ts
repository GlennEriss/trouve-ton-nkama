import { useFormContext, UseFormReturn } from "react-hook-form"
import { Step2FormPropertyMediatorFactory } from "@/factories/mediator/Step2FormPropertyMediatorFactory"
import { useMemo } from "react"

export function useStep2FormPropertyMediator() {
    const form = useFormContext() as UseFormReturn<any>
    return useMemo(() => Step2FormPropertyMediatorFactory.create(form), [form])
}