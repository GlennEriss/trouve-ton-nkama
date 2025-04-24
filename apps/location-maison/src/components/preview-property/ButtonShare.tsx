'use client'
import { Property } from '@/models/annonce'
import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Share2 } from 'lucide-react'
import ButtonShareToWhatsapp from './ButtonShareToWhatsapp'
import ButtonShareToFacebook from './ButtonShareToFacebook'

export default function ButtonShare({ property }: { property: Property }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleShare = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="relative">
      <Button
        onClick={toggleShare}
        className="text-sm rounded-full lg:rounded-lg px-2 lg:px-4 py-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 shadow-md"
      >
        <Share2 className="h-5 w-5" />
        <span className="hidden lg:block">Partager</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 flex flex-col gap-2 bg-white shadow-lg rounded p-2 z-50">
          <ButtonShareToFacebook property={property} />
          <ButtonShareToWhatsapp property={property} />
        </div>
      )}
    </div>
  )
}
