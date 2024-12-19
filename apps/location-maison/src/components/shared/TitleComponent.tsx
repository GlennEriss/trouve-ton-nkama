'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

const titleList: Record<string, string> = {
    'home': "Ajout d'une maison"
}
export default function TitleComponent() {
  const pathnames = usePathname()
  const titles = pathnames.split('/')
  const title: string = titles[titles.length - 1]
  return (
    <h1 className='font-bold text-2xl text-[#1B4D5B]'>
        {titleList[title]}
    </h1>
  )
}
