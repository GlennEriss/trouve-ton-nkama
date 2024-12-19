import React from 'react'
import { FormProperty } from '../stepper/FormProperty'
import { BuildingFormFactory } from '@/factories/property-form/building.form.factory'

export default function FormBuilding() {
  return (
    <FormProperty FactoryClass={BuildingFormFactory} />
  )
}
