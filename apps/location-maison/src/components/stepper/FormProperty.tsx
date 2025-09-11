'use client'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider';
import React from 'react'
import { PropertyFormDirector } from '@/directors/property.form.director';
import { PropertyFormBuilderFactory } from '../../factories/property-form/property.form.factory';
import dynamic from 'next/dynamic';
import FlatBotAssistant from '../ai-assistant/FlatBotAssistant';

// Lazy loading de PreviewProperty
const PreviewProperty = dynamic(() => import('../preview-property/PreviewProperty'), {
    loading: () => (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400">Chargement de l'aperçu...</div>
        </div>
    ),
    ssr: true
});

// Lazy loading des steps
const Step1 = dynamic(() => import('./Step1'), {
    loading: () => (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400">Chargement de l'étape 1...</div>
        </div>
    ),
    ssr: true
});

const Step2 = dynamic(() => import('./Step2'), {
    loading: () => (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400">Chargement de l'étape 2...</div>
        </div>
    ),
    ssr: true
});

const Step3 = dynamic(() => import('./Step3'), {
    loading: () => (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-gray-500 dark:text-gray-400">Chargement de l'étape 3...</div>
        </div>
    ),
    ssr: false // Désactive le SSR pour Step3 car il contient la carte
});

type Constructor<T> = new () => T;

interface FormPropertyProps<T extends PropertyFormBuilderFactory> {
    FactoryClass: Constructor<T>;
}
export const FormProperty = <T extends PropertyFormBuilderFactory>
    ({ FactoryClass }: FormPropertyProps<T>) => {
    const { activeStep, propertyPreview } = usePropertyFormComponentContext()
    const factory: T = new FactoryClass();
    const director: PropertyFormDirector = new PropertyFormDirector(factory);
    const dataStep1 = director.build().filter(item => item.step === 1)
    const dataStep2 = director.build().filter(item => item.step === 2)
    const dataStep3 = director.build().filter(item => item.step === 3)
    
    // Préparation du contexte pour l'assistant IA
    const formContext = {
        activeStep,
        propertyPreview,
        totalSteps: 4, // Steps 1-3 + Preview
        dataStep1,
        dataStep2,
        dataStep3,
        factoryType: FactoryClass.name
    };
    
    const currentStep = () => {
        switch (activeStep) {
            case 0:
                return <Step1 data={dataStep1} />
            case 1:
                return <Step2 data={dataStep2} />
            case 2:
                return <Step3 data={dataStep3} />
            default:
                return propertyPreview ? <PreviewProperty property={propertyPreview} /> : null
        }
    }
    return (
        <React.Fragment>
            {currentStep()}
            
            {/* Assistant IA flottant */}
            <FlatBotAssistant />
        </React.Fragment>
    )
}
