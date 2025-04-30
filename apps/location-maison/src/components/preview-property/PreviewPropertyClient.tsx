'use client'
import React from 'react'
import PreviewProperty from '@/components/preview-property/PreviewProperty'
import Advertissment from '@/components/shared/Advertissment'
import { notFound, redirect, useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useProperty } from '@/hooks/use-property'

export default function PreviewPropertyClient() {
    const { id } = useParams<{ id: string }>()
    const { user } = useCurrentUser()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error, isFetching, isStale } = useProperty(id)

    if (isLoading) {
        return <div>Chargement...</div>
    }

    if (error || !property) {
        return <div>Erreur ou propriété introuvable.</div>
    }
    if (property.createdBy !== user?.uid) {
        redirect('/houseDetails/' + id)
    }
    return (
        <div>
            <Advertissment />
            <PreviewProperty property={property} />
        </div>
    )
}
