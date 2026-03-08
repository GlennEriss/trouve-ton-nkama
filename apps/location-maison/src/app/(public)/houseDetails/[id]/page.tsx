import HouseDetails from '@/components/preview-property/HouseDetails'
//import { getPropertyById } from '@/db/property.db'
import React from 'react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('app.house-details.page')

//const propertyCache = new Map<string, { property: any; expiry: number }>()

//const cacheDuration = 1000 * 60 * 10 // 10 minutes

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/property/id?id=${id}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    const property = await res.json();

    if (!property || res.status !== 200) {
      return {};
    }

    return {
      title: property.title,
      description: property.description,
    };
  } catch (error) {
    logger.error('Error fetching metadata', { error, id });
    return {};
  }
}

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <HouseDetails />
  )
}
