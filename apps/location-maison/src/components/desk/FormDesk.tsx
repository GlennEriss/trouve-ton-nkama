'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { DeskFormFactory } from '@/factories/property-form/desk.form.factory'

export default function FormDesk() {
    return (
        <FormProperty FactoryClass={DeskFormFactory} />
    )
}
