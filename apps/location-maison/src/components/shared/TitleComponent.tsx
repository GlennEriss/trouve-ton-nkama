'use client'

import { usePathname } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'

const titleList: Record<string, string> = {
    'home': "Ajout d'une maison",
    'studio': "Ajout d'un studio",
    'apartment': "Ajout d'un appartement",
    'desk': "Ajout d'un bureau",
    'building': "Ajout d'un immeuble",
    'villa': "Ajout d'une villa",
    'room': "Ajout d'une chambre",
    'kiosk': "Ajout d'un kiosque",
    'shop': "Ajout d'un magasin",
    'land': "Ajout d'un terrain",
    'duplex': "Ajout d'un duplex",
    'warehouse': "Ajout d'un entrepôt",
}
interface TitleComponentProps {
  className?: string
}

export default function TitleComponent({ className }: TitleComponentProps) {
  const pathnames = usePathname()
  const titles = pathnames.split('/')
  const title: string = titles[titles.length - 1]
  return (
    <h1 className={cn('text-2xl font-bold text-ink dark:text-primary-200', className)}>
        {titleList[title] || "Modification d'un logement" }
    </h1>
  )
}
