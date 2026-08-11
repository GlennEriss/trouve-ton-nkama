'use client'
import React from 'react'
import { useSession } from 'next-auth/react'
import PreviewProperty from '@/components/preview-property/PreviewProperty'
import Advertissment from '@/components/shared/Advertissment'
import { notFound, redirect, useParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useProperty } from '@/hooks/use-property'

export default function PreviewPropertyClient() {
    const { id } = useParams<{ id: string }>()
    const { user } = useCurrentUser()
    // La session next-auth met un instant à se résoudre au premier montage
    // (ex: arrivée directe sur cette URL, refresh) — sans ce garde, `user`
    // est encore `undefined` sur le tout premier rendu et le propriétaire
    // légitime se fait rediriger vers /houseDetails à tort.
    const { status: sessionStatus } = useSession()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error } = useProperty(id)

    if (isLoading || sessionStatus === 'loading') {
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
