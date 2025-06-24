'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'
import PropertyCarousel from '../property/PropertyCarousel'
import { usePromotedProperties } from '@/hooks/use-promoted-properties'
import Image from 'next/image'

export default function TrendingSection() {
  const { trendingProperties, isLoading } = usePromotedProperties('trending')

  // Si pas d'annonces en tendance, ne pas afficher la section
  if (!isLoading && (!trendingProperties || trendingProperties.length === 0)) {
    return null
  }

  return (
    <section className='relative rounded-3xl space-y-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 p-5 py-10 overflow-hidden'>
      {/* Image d'arrière-plan */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/home-page/form.webp"
          alt="Background shape"
          fill
          className="object-cover opacity-5 -rotate-90"
          priority={false}
        />
      </div>
      
      {/* Contenu */}
      <div className="relative z-10">
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h1 className='text-xl font-bold text-center text-[#146B67]'>
            En tendance
          </h1>
        </div>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
          Les annonces les plus populaires du moment
        </p>
        <PropertyCarousel properties={(trendingProperties || []).filter(p => p.id) as any} />
      </div>
    </section>
  )
} 