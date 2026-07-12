'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, Video, XCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getReelsByOwner } from '@/db/reel.db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { routes } from '@/constantes/routes'
import type { ReelProcessingStatus } from '@/models/reel'

const PROCESSING_LABELS: Record<ReelProcessingStatus, string> = {
  uploading: "Envoi en cours",
  processing: "Traitement en cours",
  ready: "Prêt",
  failed: "Échec du traitement",
}

export default function MyReelsClient() {
  const { user } = useCurrentUser()

  const reelsQuery = useQuery({
    queryKey: ['reels', 'mine', user?.uid],
    queryFn: () => getReelsByOwner(user!.uid),
    enabled: Boolean(user?.uid),
  })

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href={routes.protected.properties}>
        <Button variant="ghost" size="sm" className="group -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
          Mes annonces
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mes réels</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Suivi du traitement et des annonces attachées.
          </p>
        </div>
        <Link href={routes.protected.reels_add}>
          <Button size="sm">
            <Video className="h-4 w-4 mr-1.5" />
            Nouveau
          </Button>
        </Link>
      </div>

      {reelsQuery.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      {reelsQuery.data && reelsQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">Vous n&apos;avez encore créé aucun réel.</p>
      )}

      <div className="space-y-3">
        {reelsQuery.data?.map((reel) => (
          <Card key={reel.id} className="flex items-center gap-3 p-3">
            <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
              {reel.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Video className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                {reel.processingStatus === 'ready' && reel.moderationStatus === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {reel.processingStatus === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                {PROCESSING_LABELS[reel.processingStatus]}
                {reel.processingStatus === 'ready' && ` — ${reel.moderationStatus === 'PENDING' ? 'en attente de validation' : reel.moderationStatus === 'APPROVED' ? 'approuvé' : 'rejeté'}`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {reel.propertyId ? 'Attaché à une annonce' : 'Pas encore attaché à une annonce'}
              </p>
            </div>
            {!reel.propertyId && (
              <Link href={`${routes.protected.reels_select_property}?attachReelId=${reel.id}`}>
                <Button size="sm" variant="outline">Attacher</Button>
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
