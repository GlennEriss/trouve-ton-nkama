'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { ShopFormFactory } from '@/factories/property-form/shop.form.factory'

export default function FormShop() {
    return (
        <FormProperty FactoryClass={ShopFormFactory} />
    )
}
