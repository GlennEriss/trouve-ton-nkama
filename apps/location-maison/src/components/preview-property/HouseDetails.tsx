'use client'

import { useWindowSize } from "@/hooks/useSize"
import PreviewProperty from "./PreviewProperty"
import PreviewCategoryListing from "./PreviewCategoryListing"
import { PreviewPropertyMobile } from "./PreviewPropertyMobile"
import { useProperty } from "@/hooks/use-property"
import { notFound, useParams } from "next/navigation"
import HouseDetailSkeleton from "./HouseDetailSkeleton"
import RecommendationSection from "./RecommendationSection"
import { useTrackPropertyView } from "@/hooks/use-track-property-view"
import { useMetaPixelViewContent } from "@/features/analytics/meta-pixel"
import SponsoredSlot from '@/components/ads/SponsoredSlot'
import { ADSENSE_SLOTS } from '@/lib/ads/config'
import type { Property } from '@/models/annonce'

type HouseDetailsProps = {
    /**
     * Deja recuperee par /annonce/[id]/page.tsx (Server Component). Sert d'initialData a
     * useProperty pour eviter le waterfall skeleton -> fetch client qui faisait grimper le LCP
     * mobile a plus de 10s (Vercel Speed Insights, 2026-09-14) : sans elle, la premiere image
     * ne commence a charger qu'apres la resolution du fetch /api/property/id cote client.
     */
    property?: Property
}

export default function HouseDetails({ property: initialProperty }: HouseDetailsProps) {
    const size = useWindowSize()
    const { id } = useParams<{ id: string }>()
    if (!id) {
        notFound()
    }
    const { data: property, isLoading, error } = useProperty(id, initialProperty)

    // Tracking des vues sur la page publique
    useTrackPropertyView(id)
    useMetaPixelViewContent(
        property ? { id: property.id, title: property.title, price: property.price } : null
    )

    if (isLoading) {
        return (
            <HouseDetailSkeleton />
        )
    }

    if (error || !property) {
        return <div>Erreur ou propriété introuvable.</div>
    }

    // Annonce hors immobilier (Mode, etc.) : gabarit dédié, identique en desktop et mobile
    // (mise en page responsive), contrairement à l'immobilier qui a deux composants distincts.
    const isCategoryListing = !property.typeProperty && Boolean(property.categoryId)

    if (isCategoryListing) {
        return (
            <div className={size.width > 768 ? 'py-5 px-20 space-y-10' : 'px-4 py-4 space-y-10'}>
                <PreviewCategoryListing property={property} />
                <SponsoredSlot
                    placement="property_detail"
                    province={property.province}
                    city={property.city}
                    fallbackSlot={ADSENSE_SLOTS.propertyDetail}
                    fallbackSlotKey={`category-listing-${id}`}
                    fallbackCompact={size.width <= 768}
                />
                <RecommendationSection
                    currentPropertyId={property.id}
                    currentPropertyType={property.typeProperty}
                    currentPropertyLocation={property.province}
                    currentCategoryId={property.categoryId}
                />
            </div>
        )
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
