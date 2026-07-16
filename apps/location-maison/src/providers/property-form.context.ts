'use client'
import { createContext, useContext } from "react"
import { Property } from "@/models/annonce"

export type PropertyFormComponent = {
    form: any,
    activeStep: number,
    setActiveStep: React.Dispatch<React.SetStateAction<number>>,
    propertyPreview: Property | undefined,
    setPropertyPreview: React.Dispatch<React.SetStateAction<Property | undefined>>,
    currentStepSchema: any,
    typeProperty: string,
    prepareForExternalRedirect: () => void,
    resetPropertyForm: () => Promise<void>,
    isFinalSubmitting: boolean,
    isUpdate: boolean,
}

export const PropertyFormComponentContext = createContext<PropertyFormComponent>({
    form: {},
    activeStep: 0,
    setActiveStep: () => { },
    propertyPreview: undefined,
    setPropertyPreview: () => { },
    currentStepSchema: null,
    typeProperty: '',
    prepareForExternalRedirect: () => { },
    resetPropertyForm: async () => { },
    isFinalSubmitting: false,
    isUpdate: false,
})

export const usePropertyFormComponentContext = () => {
    return useContext(PropertyFormComponentContext)
}
