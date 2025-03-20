'use client'
import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { RoomFormFactory } from '@/factories/property-form/room.form.factory'

export default function FormRoom() {
    return (
        <FormProperty FactoryClass={RoomFormFactory} />
    )
}
