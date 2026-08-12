'use client'

import BreadCrumpComponent from '@/components/shared/BreadCrumpComponent'
import React from 'react'
import { usePathname } from 'next/navigation'
import { routes } from '@/constantes/routes'

export default function template({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()

  // Le flux public de réels et la vue "réel unique" (lien profond /reels/{id}, ouvert
  // depuis WhatsApp) sont plein écran façon TikTok, sans fil d'Ariane ni marges — ce
  // wrapper (appliqué par défaut à toutes les routes protégées) casserait sinon la mise en
  // page immersive (vidéo étriquée par le padding, "Accueil > Réels" par-dessus).
  // Exclut explicitement les sous-routes statiques connues (mine/add/select-property),
  // qui elles gardent le wrapper standard (formulaires, pas des vues plein écran).
  const KNOWN_REELS_SUBROUTES: string[] = [
    routes.protected.reels_mine,
    routes.protected.reels_add,
    routes.protected.reels_select_property,
  ]
  const isSingleReelView = /^\/reels\/[^/]+\/?$/.test(pathname) && !KNOWN_REELS_SUBROUTES.includes(pathname)
  if (pathname === routes.protected.reels || isSingleReelView) {
    return <>{children}</>
  }

  return (
    <div className='flex flex-col gap-4 md:py-4 md:px-10 xl:px-20'>
      {/* container-page + px-4 md:px-6 : meme systeme de centrage/largeur max que
          les pages (ex. MyBalanceHistoryComponent) pour que le fil d'Ariane
          s'aligne exactement avec leur contenu sur grand ecran, au lieu de
          coller au padding fixe du wrapper. */}
      <div className="container-page px-4 md:px-6">
        <BreadCrumpComponent hideOnMobile={true} />
      </div>
      <main>
        {children}
      </main>
    </div>
  )
}
