'use client'
import { usePropertyFormComponentContext } from '@/providers/property.form.provider';
import React from 'react'
import { PropertyFormDirector } from '@/directors/property.form.director';
import { PropertyFormBuilderFactory } from '../../factories/property-form/property.form.factory';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import PreviewProperty from '../preview-property/PreviewProperty';
import FlatBotAssistant from '../ai-assistant/FlatBotAssistant';

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
            <FlatBotAssistant formContext={formContext} />
        </React.Fragment>
    )
}
