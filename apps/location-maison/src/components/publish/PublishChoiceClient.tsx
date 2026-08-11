'use client'

import Link from 'next/link'
import { Building2, Video } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Card } from '@/components/ui/card'
import { routes } from '@/constantes/routes'

export default function PublishChoiceClient() {
  const { user } = useCurrentUser()
  const isAnnouncer = Array.isArray(user?.roles) && user.roles.includes('Announcer')
  const createReelHref = isAnnouncer ? routes.protected.reels_select_property : routes.protected.reels_add

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Publier</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Que voulez-vous faire ?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <Link href={routes.protected.add_property_ai} className="block h-full">
          <Card className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all">
            <Building2 className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Publier une annonce</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Louer ou vendre un bien</p>
            </div>
          </Card>
        </Link>

        <Link href={createReelHref} className="block h-full">
          <Card className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all">
            <Video className="h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">Créer un réel</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Vidéo courte pour mettre en avant un bien</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
