'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { ApartmentFormFactory } from '@/factories/property-form/apartment.form.factory'

export default function FormApartment() {
    return (
        <FormProperty FactoryClass={ApartmentFormFactory} />
    )
}
