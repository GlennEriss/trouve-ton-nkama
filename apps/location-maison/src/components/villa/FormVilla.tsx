'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { VillaFormFactory } from '@/factories/property-form/villa.form.factory'

export default function FormVilla() {
    return (
        <FormProperty FactoryClass={VillaFormFactory} />
    )
}
