'use client'
import { getFactoryClass } from '@/lib/getFactoryClass'
import React from 'react'
import { FormProperty } from './FormProperty'
import { Property } from '@/models/annonce'
import { getPropertyById } from '@/db/property.db'
import { redirect } from 'next/navigation'
import { routes } from '@/constantes/routes'
import { useCurrentUser } from '@/hooks/use-current-user'

type FormModifyPropertyProps = {
    id: string
}
export const FormModifyProperty: React.FC<FormModifyPropertyProps> = ({ id }) => {
    const {user} = useCurrentUser()
    const [property, setProperty] = React.useState<Property | null>(null)
    React.useEffect(() => {
        getPropertyById(id)
            .then((property) => setProperty(property))
    }, [id])
    if (!property || !user) {
        return (
            <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
        )
    }
    if(property.createdBy !== user.uid){
        return redirect(routes.protected.properties)
    }
    return (
        <FormProperty FactoryClass={getFactoryClass(property.typeProperty)} />
    )
}
