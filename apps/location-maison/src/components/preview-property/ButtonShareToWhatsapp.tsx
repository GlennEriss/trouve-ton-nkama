'use client'
import { Property } from '@/models/annonce'
import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { useTrackPropertyInteraction } from "@/hooks/use-track-property-interaction"

export default function ButtonShareToWhatsapp({ property }: Readonly<{ property: Property }>) {
  const { trackInteraction } = useTrackPropertyInteraction(property.id)

  const handleShare = () => {
    // Tracker le partage WhatsApp
    trackInteraction('whatsapp_share');

    const message = `🏠 Découvrez cette annonce sur Trouve Ton Nkama :
${property.title}
${property.description?.slice(0, 100)}...
📍 ${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
    >
      <FaWhatsapp size={20} />
    </button>
  )
}
