'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, Video } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getProperties } from '@/db/property.db'
import { Card } from '@/components/ui/card'
import { routes } from '@/constantes/routes'

export default function PublishChoiceClient() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const [isChecking, setIsChecking] = React.useState(false)

  // Vérifié seulement au clic, pas au chargement de la page : ce n'est qu'une décision de
  // routage ("as-tu déjà une annonce ?"), pas une donnée à afficher — un bouton qui redirige
  // n'a pas besoin d'un état de chargement visible avant même d'être cliqué.
  const handleCreateReel = async () => {
    if (!user?.uid) {
      router.push(routes.protected.reels_add)
      return
    }

    setIsChecking(true)
    try {
      const result = await getProperties({ limitPerPage: 1, lastDoc: null, createdBy: user.uid })
      router.push(result.properties.length > 0 ? routes.protected.reels_select_property : routes.protected.reels_add)
    } catch {
      router.push(routes.protected.reels_add)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Publier</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Que voulez-vous faire ?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <Link href={routes.protected.add_property} className="block h-full">
          <Card className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all">
            <Building2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Publier une annonce</p>
              <p className="text-xs text-slate-500 mt-1">Louer ou vendre un bien</p>
            </div>
          </Card>
        </Link>

        <Card
          className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all"
          onClick={isChecking ? undefined : handleCreateReel}
        >
          {isChecking ? (
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          ) : (
            <Video className="h-10 w-10 text-emerald-600" />
          )}
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Créer un réel</p>
            <p className="text-xs text-slate-500 mt-1">Vidéo courte pour mettre en avant un bien</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
