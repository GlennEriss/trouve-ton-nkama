import PreviewProperty from '@/components/preview-property/PreviewProperty'
import { getPropertyById } from '@/db/property.db'
import { notFound } from 'next/navigation'
import React from 'react'

export async function generateMetadata({ params }: { params:  Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getPropertyById(id)

  if (!property) {
    return {}
  }

  return {
    title: property.title,
    description: property.description,
    openGraph: {
      title: property.title,
      description: property.description,
      images: [
        {
          url: property.images[0]?.fileURL || '',
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
      url: `https://www.logi-market.com/houseDetails/${property.id}`,
      type: 'website',
    },
  }
}

export default async function page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const property = await getPropertyById(id)

  if (!property) {
    return notFound()
  }

  return (
    <div className='md:px-10 lg:px-20'>
      <PreviewProperty property={property} />
    </div>
  )
}