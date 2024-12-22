'use client'
import { getFactoryClass } from '@/lib/getFactoryClass'
import React from 'react'
import { FormProperty } from './FormProperty'
import { Property } from '@/models/annonce'
import { getPropertyById } from '@/db/property.db'

type FormModifyPropertyProps = {
    id: string
}
export const FormModifyProperty: React.FC<FormModifyPropertyProps> = ({ id }) => {
    const [property, setProperty] = React.useState<Property | null>(null)
    React.useEffect(() => {
        getPropertyById(id)
            .then((property) => setProperty(property))
    }, [id])
    if (!property) {
        return (
            <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        )
    }
    return (
        <FormProperty FactoryClass={getFactoryClass(property.typeProperty)} />
    )
}
