import { TypeProperty } from '@/constantes/property-type'
import { routes } from '@/constantes/routes'
import { Home, Building, Warehouse, Briefcase, Building2, Bed, Store, ShoppingBag, Globe } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import AppMobileStickyHeader from '@/components/shared/AppMobileStickyHeader'

const buttonList = [
  {
    label: TypeProperty.Home,
    link: routes.protected.add_home,
    icon: <Home size={24} />
  },
  {
    label: TypeProperty.Studio,
    link: routes.protected.add_studio,
    icon: <Warehouse size={24} />
  },
  {
    label: TypeProperty.Apartment,
    link: routes.protected.add_apartment,
    icon: <Building size={24} />
  },
  /* {
    label: TypeProperty.Villa,
    link: routes.protected.add_villa,
    icon: <Landmark size={24} />
  }, */
  {
    label: TypeProperty.Building,
    link: routes.protected.add_building,
    icon: <Building2 size={24} />
  },
  {
    label: TypeProperty.Desk,
    link: routes.protected.add_desk,
    icon: <Briefcase size={24} />
  },
  {
    label: TypeProperty.Room,
    link: routes.protected.add_room,
    icon: <Bed size={24} />
  },
  {
    label: TypeProperty.Kiosk,
    link: routes.protected.add_kiosk,
    icon: <Store size={24} />
  },
  {
    label: TypeProperty.Shop,
    link: routes.protected.add_shop,
    icon: <ShoppingBag size={24} />
  },
  {
    label: TypeProperty.Land,
    link: routes.protected.add_land,
    icon: <Globe size={24} />
  }, 
]
export default function page() {
  return (
    <div className='space-y-8 min-h-screen pb-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 mb-10 md:pt-1'>
      <AppMobileStickyHeader
        title='Ajouter un logement'
        backHref={routes.protected.properties}
        className='px-6 py-4 bg-white dark:bg-gray-800 shadow-md'
      />

      {/* Section des boutons */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-6'>
        {
          buttonList.map((item, index) => (
            <Link
              className='text-lg font-semibold flex flex-col items-center gap-4 justify-center border p-5 rounded-xl shadow-md lg:h-[140px] lg:text-xl transition-all bg-white dark:bg-gray-800 dark:border-gray-700 hover:scale-105 hover:shadow-lg hover:bg-blue-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
              href={item.link}
              key={item.link}>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-gray-700">
                {item.icon}
              </div>
              {item.label}
            </Link>
          ))
        }
      </div>
    </div>
  )
}
