'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

const titleList: Record<string, string> = {
    'home': "Ajout d'une maison",
    'studio': "Ajout d'un studio",
    'apartment': "Ajout d'un appartement",
    'desk': "Ajout d'un bureau",
    'building': "Ajout d'un immeuble",
    'villa': "Ajout d'une villa",
}
export default function TitleComponent() {
  const pathnames = usePathname()
  const titles = pathnames.split('/')
  const title: string = titles[titles.length - 1]
  return (
    <h1 className='font-bold text-2xl text-[#1B4D5B]'>
        {titleList[title] || "Modification d'un logement" }
    </h1>
  )
}
