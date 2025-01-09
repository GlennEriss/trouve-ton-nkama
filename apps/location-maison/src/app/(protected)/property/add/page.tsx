import { routes } from '@/constantes/routes'
import { ChevronLeft, Home, Building, Landmark, Warehouse, Briefcase, Building2 } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const buttonList = [
  {
    label: "Maison",
    link: routes.protected.add_home,
    icon: <Home size={24} />
  },
  {
    label: "Studio",
    link: routes.protected.add_studio,
    icon: <Building2 size={24} />
  },
  {
    label: "Appartement",
    link: routes.protected.add_apartment,
    icon: <Building size={24} />
  },
  {
    label: "Villa",
    link: routes.protected.add_villa,
    icon: <Landmark size={24} />
  },
  {
    label: "Immeuble",
    link: routes.protected.add_building,
    icon: <Warehouse size={24} />
  },
  {
    label: "Bureau",
    link: routes.protected.add_desk,
    icon: <Briefcase size={24} />
  },
]
export default function page() {
  return (
    <div className='space-y-6 bg-gray-50 min-h-screen mb-10'>
      <div className='bg-white sticky top-0 flex gap-5 items-center border-b py-3 md:hidden px-4 z-50 shadow'>
        <Link href={routes.protected.properties}>
          <ChevronLeft />
        </Link>
        <h1 className='text-xl font-bold'>Ajouter un logement</h1>
      </div>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 px-6'>
        {
          buttonList.map((item, index) => (
            <Link
              className='text-xl font-semibold flex items-center gap-4 justify-center border p-5 rounded-xl lg:h-[130px] lg:text-2xl transition-all hover:bg-blue-50 hover:shadow-lg focus:ring focus:ring-blue-300 text-blue-700 border-blue-300'
              href={item.link}
              key={index}>
              {item.icon}
              {item.label}
            </Link>
          ))
        }
      </div>
    </div>
  )
}
