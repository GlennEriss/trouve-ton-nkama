"use client"
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { LandFormFactory } from '@/factories/property-form/land.form.factory'

export default function FormLand() {
    return (
        <FormProperty FactoryClass={LandFormFactory} />
    )
}
