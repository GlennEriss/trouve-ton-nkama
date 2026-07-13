'use client'

import BreadCrumpComponent from '@/components/shared/BreadCrumpComponent'
import React from 'react'
import { usePathname } from 'next/navigation'
import { routes } from '@/constantes/routes'

export default function template({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()

  // Le flux public de réels est plein écran façon TikTok, sans fil d'Ariane ni marges — ce
  // wrapper (appliqué par défaut à toutes les routes protégées) casserait sinon la mise en
  // page immersive (vidéo étriquée par le padding, "Accueil > Réels" par-dessus).
  if (pathname === routes.protected.reels) {
    return <>{children}</>
  }

  return (
    <div className='flex flex-col gap-4 md:py-4 md:px-10 xl:px-20'>
      <BreadCrumpComponent hideOnMobile={true} />
      <main>
        {children}
      </main>
    </div>
  )
}
