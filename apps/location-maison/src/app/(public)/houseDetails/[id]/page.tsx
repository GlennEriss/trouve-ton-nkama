import HouseDetails from '@/components/preview-property/HouseDetails'
import { getPropertyById } from '@/db/property.db'
import React from 'react'

const propertyCache = new Map<string, { property: any; expiry: number }>()

const cacheDuration = 1000 * 60 * 10 // 10 minutes

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cached = propertyCache.get(id)
  const now = Date.now()

  if (cached && cached.expiry > now) {
    const cachedProperty = cached.property
    if (!cachedProperty) {
      return {}
    }
    return {
      title: cachedProperty.title,
      description: cachedProperty.description,
      openGraph: {
        title: cachedProperty.title,
        description: cachedProperty.description,
        url: `https://www.logi-market.com/houseDetails/${cachedProperty.id}`,
        type: 'website',
      },
    }
  }

  const property = await getPropertyById(id)

  propertyCache.set(id, { property, expiry: now + cacheDuration })

  if (!property) {
    return {}
  }

  return {
    title: property.title,
    description: property.description,
    openGraph: {
      title: property.title,
      description: property.description,
      url: `https://www.logi-market.com/houseDetails/${property.id}`,
      type: 'website',
    },
  }
}

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <HouseDetails/>
  )
}