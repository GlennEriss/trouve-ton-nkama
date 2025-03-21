'use client'
import { getPropertyById } from '@/db/property.db'
import useLastpath from '@/hooks/use-lastpath'
import { Property } from '@/models/annonce'
import { PropertyFormComponentProvider } from '@/providers/property.form.provider'
import React from 'react'
import { LoadingSpinner } from '../shared/LoadingSpinner'

export default function ModifyPropertyWithProvider({ children }: { children: React.ReactNode }) {
    const id = useLastpath()
    const [property, setProperty] = React.useState<Partial<Property>|null>(null)
    React.useEffect(() => {
        if (id) {
            getPropertyById(id).then((fetchedProperty) => {
                // Set form values dynamically
                if (fetchedProperty) {
                    const { createdAt, updatedAt, ...othersData } = fetchedProperty
                    setProperty(othersData)
                }
            });

        }
    }, [id])
    if(!property){
        return (
            <LoadingSpinner/>
        )
    }
    return (
        <PropertyFormComponentProvider isUpdate={true} propertyToUpdated={property}>
            {children}
        </PropertyFormComponentProvider>
    )
}
