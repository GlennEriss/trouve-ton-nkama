'use client'

import React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Trash2, Video, XCircle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { deleteReel, getReelsByOwner } from '@/db/reel.db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { routes } from '@/constantes/routes'
import { useToast } from '@/hooks/use-toast'
import type { Reel, ReelProcessingStatus } from '@/models/reel'

const PROCESSING_LABELS: Record<ReelProcessingStatus, string> = {
  uploading: "Envoi en cours",
  processing: "Traitement en cours",
  ready: "Prêt",
  failed: "Échec du traitement",
}

export default function MyReelsClient() {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reelToDelete, setReelToDelete] = React.useState<(Reel & { id: string }) | null>(null)

  const reelsQuery = useQuery({
    queryKey: ['reels', 'mine', user?.uid],
    queryFn: () => getReelsByOwner(user!.uid),
    enabled: Boolean(user?.uid),
  })

  const deleteMutation = useMutation({
    mutationFn: (reelId: string) => deleteReel(reelId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reels', 'mine', user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['reels-feed'] }),
      ])
      setReelToDelete(null)
      toast({
        title: "Réel supprimé",
        description: "Le réel a bien été supprimé.",
      })
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description: error instanceof Error ? error.message : "Une erreur est survenue.",
        variant: "destructive",
      })
    },
  })

  const isDeleting = deleteMutation.isPending

  return (
    <>
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
                {reel.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {reel.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <Link href={`/reels/${reel.id}/edit`}>
                  <Button size="sm" variant="outline" className="w-full">
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Modifier
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setReelToDelete(reel)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Supprimer
                </Button>
                {!reel.propertyId && (
                  <Link href={`${routes.protected.reels_select_property}?attachReelId=${reel.id}`}>
                    <Button size="sm" variant="outline" className="w-full">Attacher</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={Boolean(reelToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setReelToDelete(null)
        }}
      >
        <DialogContent className="max-w-md" isDefaultIconClose={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Supprimer ce réel ?</DialogTitle>
            <DialogDescription>
              Cette action supprimera le réel de votre liste et du fil public s&apos;il était déjà approuvé. Elle est définitive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReelToDelete(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (reelToDelete) deleteMutation.mutate(reelToDelete.id)
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
