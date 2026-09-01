'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, MapPin, Video } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getProperties } from '@/db/property.db'
import { attachReelToProperty } from '@/db/reel.db'
import { resolveThumbnailUrl } from '@/lib/property-images'
import { Button } from '@trouve-ton-nkama/ui/button'
import { Card } from '@trouve-ton-nkama/ui/card'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import type { Property } from '@/models/annonce'

export default function SelectPropertyForReelClient() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const attachReelId = searchParams.get('attachReelId')
  const [attachingId, setAttachingId] = React.useState<string | null>(null)
  const noPropertyHref = attachReelId ? routes.protected.reels_mine : routes.protected.reels_add

  const propertiesQuery = useQuery({
    queryKey: ['properties', 'select-for-reel', user?.uid],
    queryFn: async () => {
      const result = await getProperties({ limitPerPage: 50, lastDoc: null, createdBy: user?.uid })
      return result.properties
    },
    enabled: Boolean(user?.uid),
  })

  const handleSelect = async (property: Property) => {
    if (!attachReelId) {
      router.push(`${routes.protected.reels_add}?propertyId=${property.id}`)
      return
    }

    setAttachingId(property.id ?? null)
    try {
      const ok = await attachReelToProperty(attachReelId, property.id!)
      if (!ok) throw new Error("Impossible de rattacher le réel.")
      // Sans ça, /reels/mine (MyReelsClient.tsx) réaffichait l'ancien état en cache
      // (react-query) au retour — "Pas encore attaché à une annonce" alors que le
      // rattachement était déjà bien écrit en base. Même clé que ses propres invalidations
      // (REELS_QUERY_KEY = 'reels-mine').
      await queryClient.invalidateQueries({ queryKey: ['reels-mine', user?.uid] })
      toast({ title: "Réel rattaché", description: `Rattaché à "${property.title}".` })
      router.push(routes.protected.reels_mine)
    } catch (error) {
      toast({
        title: "Échec du rattachement",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      })
    } finally {
      setAttachingId(null)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href={attachReelId ? routes.protected.reels_mine : routes.protected.publish}>
        <Button variant="ghost" size="sm" className="group -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Retour
        </Button>
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {attachReelId ? "Choisir l'annonce à attacher" : "Pour quelle annonce ?"}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {attachReelId
            ? "Sélectionnez l'annonce à laquelle rattacher ce réel, ou gardez-le sans annonce."
            : "Choisissez une annonce, ou créez un réel indépendant sans rattachement."}
        </p>
      </div>

      <Link href={noPropertyHref} className="block">
        <Card className="flex items-center gap-3 border-secondary/40 bg-secondary/5 p-3 transition-colors hover:bg-secondary/10 dark:border-secondary/40 dark:bg-secondary/10">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <Video className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary dark:text-secondary">
              {attachReelId ? "Garder sans annonce" : "Créer sans annonce"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {attachReelId
                ? "Ce réel restera visible dans le flux, sans être lié à un bien."
                : "Publiez une vidéo indépendante maintenant, puis rattachez-la plus tard si besoin."}
            </p>
          </div>
        </Card>
      </Link>

      {propertiesQuery.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      {propertiesQuery.data && propertiesQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">Vous n&apos;avez aucune annonce publiée pour le moment.</p>
      )}

      <div className="space-y-3">
        {propertiesQuery.data?.map((property) => (
          <Card
            key={property.id}
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onClick={() => !attachingId && handleSelect(property)}
          >
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
              {resolveThumbnailUrl(property.images?.[0]) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveThumbnailUrl(property.images?.[0])} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{property.title}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />
                {property.city}
              </p>
            </div>
            {attachingId === property.id && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
          </Card>
        ))}
      </div>
    </div>
  )
}
