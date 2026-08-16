'use client'
import React from 'react'
import PropertyCarousel from '../property/PropertyCarousel'
import Image from 'next/image'
import { useRecommend } from '@/hooks/use-recommend'

interface RecommendationSectionProps {
    currentPropertyId: string;
    currentPropertyType: string;
    currentPropertyLocation: string;
    /** Feuille de catégorie pour une annonce hors immobilier (voir getRecommendedProperties). */
    currentCategoryId?: string;
}

export default function RecommendationSection({ 
    currentPropertyId, 
    currentPropertyType, 
    currentPropertyLocation,
    currentCategoryId
}: Readonly<RecommendationSectionProps>) {
    const { properties, loading, error } = useRecommend({
        limit: 8,
        excludeId: currentPropertyId,
        // Hors immobilier, on recommande par catégorie : `type`/`location` reposent sur
        // typeProperty/province, sans pertinence pour un vêtement ou un parfum.
        type: currentCategoryId ? undefined : currentPropertyType,
        location: currentCategoryId ? undefined : currentPropertyLocation,
        categoryId: currentCategoryId
    });

    if (loading) return null;
    if (error) return null;
    if (properties.length === 0) return null;

    return (
        <section className='relative space-y-3 bg-gradient-to-r from-primary/5 via-secondary/10 to-primary/5 rounded-3xl p-5 py-10 overflow-hidden'>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 overflow-hidden">
                <Image
                    src="/assets/home-page/form.webp"
                    alt="Background shape"
                    fill
                    className="object-cover opacity-10 -rotate-90"
                />
            </div>
            <h1 className='text-xl lg:text-2xl xl:text-3xl leading-tight font-bold text-center text-primary'>
                Annonces similaires
            </h1>
            <PropertyCarousel properties={properties} isRecommendation={true} />
        </section>
    )
} 