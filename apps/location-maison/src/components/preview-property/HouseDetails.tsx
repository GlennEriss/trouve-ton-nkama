'use client'

import { useWindowSize } from "@/hooks/useSize"
import PreviewProperty from "./PreviewProperty"
import { PreviewPropertyMobile } from "./PreviewPropertyMobile"
import { useProperty } from "@/hooks/use-property"
import { notFound, useParams } from "next/navigation"
import HouseDetailSkeleton from "./HouseDetailSkeleton"
import RecommendationSection from "./RecommendationSection"
import { useTrackPropertyView } from "@/hooks/use-track-property-view"
import SponsoredSlot from '@/components/ads/SponsoredSlot'
import { ADSENSE_SLOTS } from '@/lib/ads/config'

export default function HouseDetails() {
    const size = useWindowSize()
    const { id } = useParams<{ id: string }>()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error } = useProperty(id)
    
    // Tracking des vues sur la page publique
    useTrackPropertyView(id)

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
                <SponsoredSlot
                    placement="property_detail"
                    province={property.province}
                    city={property.city}
                    fallbackSlot={ADSENSE_SLOTS.propertyDetail}
                    fallbackSlotKey={`property-desktop-${id}`}
                />
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
            <SponsoredSlot
                className="mx-4"
                placement="property_detail"
                province={property.province}
                city={property.city}
                fallbackSlot={ADSENSE_SLOTS.propertyDetail}
                fallbackSlotKey={`property-mobile-${id}`}
                fallbackCompact
            />
            <RecommendationSection 
                currentPropertyId={property.id}
                currentPropertyType={property.typeProperty}
                currentPropertyLocation={property.province}
            />
        </div>
    )
}
