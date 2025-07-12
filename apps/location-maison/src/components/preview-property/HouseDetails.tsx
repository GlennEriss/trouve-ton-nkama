'use client'

import { useWindowSize } from "@/hooks/useSize"
import PreviewProperty from "./PreviewProperty"
import { PreviewPropertyMobile } from "./PreviewPropertyMobile"
import { useProperty } from "@/hooks/use-property"
import { notFound, useParams } from "next/navigation"
import HouseDetailSkeleton from "./HouseDetailSkeleton"
import RecommendationSection from "./RecommendationSection"

export default function HouseDetails() {
    const size = useWindowSize()
    const { id } = useParams<{ id: string }>()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error } = useProperty(id)

    if (isLoading) {
        return (
            <HouseDetailSkeleton />
        )
    }

    if (error || !property) {
        return <div>Erreur ou propriété introuvable.</div>
    }

    if (size.width > 768) {
        return (
            <div className='py-5 px-20 space-y-10'>
                <PreviewProperty property={property} />
                <RecommendationSection 
                    currentPropertyId={property.id}
                    currentPropertyType={property.typeProperty}
                    currentPropertyLocation={property.province}
                />
            </div>
        )
    }

    return (
        <div className="space-y-10">
            <PreviewPropertyMobile property={property} />
            <RecommendationSection 
                currentPropertyId={property.id}
                currentPropertyType={property.typeProperty}
                currentPropertyLocation={property.province}
            />
        </div>
    )
}
