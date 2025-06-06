'use client'

import React from 'react'
import { Star } from 'lucide-react'
import PropertyCarousel from '../property/PropertyCarousel'
import { usePromotedProperties } from '@/hooks/use-promoted-properties'

export default function FeaturedSection() {
  const { featuredProperties, isLoading } = usePromotedProperties('featured')

  // Si pas d'annonces à la une, ne pas afficher la section
  // Temporairement désactivé pour debug
  if (!isLoading && (!featuredProperties || featuredProperties.length === 0)) {
     return null
   }

  return (
    <section className='rounded-3xl space-y-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 p-5 py-10'>
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center">
          <Star className="w-5 h-5 text-white" />
        </div>
        <h1 className='text-xl font-bold text-center text-[#146B67] flex items-center gap-2'>
          <Star className="w-5 h-5 text-yellow-500" />
          À la une
        </h1>
      </div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        Les meilleures annonces sélectionnées pour vous
      </p>
      <PropertyCarousel properties={(featuredProperties || []).filter(p => p.id) as any} />
    </section>
  )
} 