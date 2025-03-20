'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { KioskFormFactory } from '@/factories/property-form/kiosk.form.factory'

export default function FormKiosk() {
    return (
        <FormProperty FactoryClass={KioskFormFactory} />
    )
}
