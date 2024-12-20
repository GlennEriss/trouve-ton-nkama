'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { StudioFormFactory } from '@/factories/property-form/studio.form.factory'

export default function FormStudio() {
    return (
        <FormProperty FactoryClass={StudioFormFactory} />
    )
}
