'use client'
import React from 'react'
import { useSession } from 'next-auth/react'
import PreviewProperty from '@/components/preview-property/PreviewProperty'
import PreviewCategoryListing from '@/components/preview-property/PreviewCategoryListing'
import HouseDetailSkeleton from '@/components/preview-property/HouseDetailSkeleton'
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
    // légitime se fait rediriger vers /annonce à tort.
    const { status: sessionStatus } = useSession()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error } = useProperty(id)

    if (isLoading || sessionStatus === 'loading') {
        return <HouseDetailSkeleton />
    }

    if (error || !property) {
        return <div>Erreur ou propriété introuvable.</div>
    }
    if (property.createdBy !== user?.uid) {
        redirect('/annonce/' + id)
    }

    // Même discriminant que la page publique (HouseDetails.tsx) : une annonce Mode n'a pas
    // `typeProperty` et n'a jamais les champs immobilier que PreviewProperty suppose garantis
    // (ex. `property.tags`, absent hors immobilier — provoquait un crash React ici avant ce
    // correctif, constaté en e2e réel sur le bouton "Voir" d'une annonce Mode).
    const isCategoryListing = !property.typeProperty && Boolean(property.categoryId)

    return (
        <div>
            <Advertissment />
            {isCategoryListing ? (
                // PreviewCategoryListing n'a pas de padding horizontal propre (contrairement à
                // PreviewProperty, auto-paddé) — HouseDetails.tsx (page publique) l'enveloppe
                // toujours avec ce padding ; oublié ici lors de l'ajout de cette branche, d'où
                // des éléments collés aux bords en vue mobile.
                <div className="px-4 py-4 md:px-20 md:py-5 space-y-10">
                    <PreviewCategoryListing property={property} />
                </div>
            ) : (
                <PreviewProperty property={property} />
            )}
        </div>
    )
}
