import PreviewProperty from '@/components/preview-property/PreviewProperty'
import { getPropertyById } from '@/db/property.db'
import { notFound } from 'next/navigation'
import React from 'react'
import Head from 'next/head'

export default async function page({ params }: { params: { id: string } }) {
  const { id } = params
  const property = await getPropertyById(id)

  if (!property) {
    return notFound()
  }

  const baseUrl = 'https://location-maison-gabon.vercel.app'
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": property.title,
    "image": property.images?.[0]?.fileURL || "/home.png",
    "description": property.description,
    "brand": {
      "@type": "Brand",
      "name": "LogisGabon"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "XAF",
      "price": property.price,
      "availability": "https://schema.org/InStock",
      "url": `${baseUrl}/houseDetails/${property.id}`
    }
  }

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>
      <PreviewProperty property={property} />
    </>
  )
}