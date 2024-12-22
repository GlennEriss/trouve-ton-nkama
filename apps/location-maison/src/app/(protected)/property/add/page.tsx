import { routes } from '@/constantes/routes'
import Link from 'next/link'
import React from 'react'

const buttonList = [
  {
    label: "Maison",
    link: routes.protected.add_home
  },
  {
    label: "Studio",
    link: routes.protected.add_studio
  },
  {
    label: "Appartement",
    link: routes.protected.add_apartment
  },
  {
    label: "Villa",
    link: routes.protected.add_villa
  },
  {
    label: "Immeuble",
    link: routes.protected.add_building
  },
  {
    label: "Bureau",
    link: routes.protected.add_desk
  },
]
export default function page() {
  return (
    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
      {
        buttonList.map((item, index) => (
          <Link 
          className='text-xl border p-5 rounded-xl lg:h-[130px] lg:text-3xl'
          href={item.link} 
          key={index}>
            {item.label}
          </Link>
        ))
      }
    </div>
  )
}
