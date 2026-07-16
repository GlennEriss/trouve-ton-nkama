'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Filter,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { deleteReel, getReelsByOwner } from '@/db/reel.db'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'
import { useToast } from '@/hooks/use-toast'
import type { Reel, ReelProcessingStatus } from '@/models/reel'

const REELS_PAGE_SIZE = 12
const REELS_QUERY_KEY = 'reels-mine'

const PROCESSING_LABELS: Record<ReelProcessingStatus, string> = {
  uploading: 'Envoi en cours',
  processing: 'Traitement en cours',
  ready: 'Prêt',
  failed: 'Échec du traitement',
}

const MODERATION_LABELS: Record<string, string> = {
  PENDING: 'En attente de validation',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
}

const MODERATION_CLASSES: Record<string, string> = {
  PENDING: 'bg-amber-100/95 text-amber-800',
  APPROVED: 'bg-emerald-100/90 text-emerald-800',
  REJECTED: 'bg-red-100/95 text-red-800',
}

const CONTROL_CLASS =
  'h-12 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm shadow-none transition-colors focus-visible:border-[#1FA89B] focus-visible:ring-0 dark:border-gray-700 dark:bg-gray-800/70'

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

type ReelWithId = Reel & { id: string }

function ReelCard({
  reel,
  onDelete,
}: Readonly<{
  reel: ReelWithId
  onDelete: (reel: ReelWithId) => void
}>) {
  const moderationLabel = reel.processingStatus === 'ready' ? MODERATION_LABELS[reel.moderationStatus] : null
  const moderationClass = reel.moderationStatus ? MODERATION_CLASSES[reel.moderationStatus] : ''
  const createdAtDate =
    reel.createdAt && 'seconds' in reel.createdAt
      ? new Date(reel.createdAt.seconds * 1000)
      : null

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-10 w-10 text-gray-400" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          {reel.processingStatus !== 'ready' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur',
                reel.processingStatus === 'failed'
                  ? 'bg-red-100/95 text-red-800'
                  : 'bg-white/90 text-gray-900'
              )}
            >
              {reel.processingStatus === 'failed' ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {PROCESSING_LABELS[reel.processingStatus]}
            </span>
          )}
          {moderationLabel && (
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur', moderationClass)}>
              {reel.moderationStatus === 'APPROVED' && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
              {moderationLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="space-y-1.5">
          <p className="line-clamp-1 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Link2 className="h-3.5 w-3.5 text-[#146B67]" />
            {reel.propertyId ? 'Attaché à une annonce' : 'Pas encore attaché à une annonce'}
          </p>
          {reel.description ? (
            <p className="line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{reel.description}</p>
          ) : (
            <p className="text-sm italic text-gray-400 dark:text-gray-500">Sans description</p>
          )}
        </div>

        {createdAtDate && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
            <p className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Publié le {createdAtDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        )}

        <div className="mt-auto space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-9 rounded-full" asChild>
              <Link href={`/reels/${reel.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
              onClick={() => onDelete(reel)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Supprimer
            </Button>
          </div>
          {!reel.propertyId && (
            <Button variant="outline" className="h-9 w-full rounded-full" asChild>
              <Link href={`${routes.protected.reels_select_property}?attachReelId=${reel.id}`}>
                <Link2 className="mr-1.5 h-4 w-4" />
                Attacher à une annonce
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function MyReelsClient() {
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reelToDelete, setReelToDelete] = useState<ReelWithId | null>(null)
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const startDate = useMemo(() => parseDateInput(startDateInput), [startDateInput])
  const endDate = useMemo(() => {
    const parsed = parseDateInput(endDateInput)
    return parsed ? endOfDay(parsed) : null
  }, [endDateInput])

  const hasActiveFilters = Boolean(startDateInput || endDateInput)

  const reelsQuery = useInfiniteQuery({
    queryKey: [REELS_QUERY_KEY, user?.uid, startDateInput, endDateInput],
    enabled: Boolean(user?.uid),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getReelsByOwner(user!.uid, {
        limitPerPage: REELS_PAGE_SIZE,
        cursor: pageParam,
        startDate,
        endDate,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const reels = useMemo(
    () => reelsQuery.data?.pages.flatMap((page) => page.reels) ?? [],
    [reelsQuery.data?.pages]
  )
  const hasMore = Boolean(reelsQuery.hasNextPage)

  const fetchNextPage = useCallback(() => {
    if (!reelsQuery.hasNextPage || reelsQuery.isFetchingNextPage) return
    void reelsQuery.fetchNextPage()
  }, [reelsQuery])

  useEffect(() => {
    const element = sentinelRef.current
    if (!element || !hasMore || reelsQuery.isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchNextPage()
        }
      },
      { rootMargin: '320px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [fetchNextPage, hasMore, reelsQuery.isFetchingNextPage])

  const resetFilters = useCallback(() => {
    setStartDateInput('')
    setEndDateInput('')
  }, [])

  const deleteMutation = useMutation({
    mutationFn: (reelId: string) => deleteReel(reelId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [REELS_QUERY_KEY, user?.uid] }),
        queryClient.invalidateQueries({ queryKey: ['reels-feed'] }),
      ])
      setReelToDelete(null)
      toast({
        title: 'Réel supprimé',
        description: 'Le réel a bien été supprimé.',
        variant: 'success',
      })
    },
    onError: (error) => {
      toast({
        title: 'Suppression impossible',
        description: error instanceof Error ? error.message : 'Une erreur est survenue.',
        variant: 'destructive',
      })
    },
  })

  const isDeleting = deleteMutation.isPending
  const isInitialLoading = reelsQuery.isLoading

  return (
    <div className="space-y-6 px-4 pb-20 pt-2 md:px-0 md:pb-8">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={routes.protected.properties}>
              <Button variant="ghost" size="sm" className="group -ml-2 mb-2">
                <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                Mes annonces
              </Button>
            </Link>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#146B67]">
              <Video className="h-3.5 w-3.5" />
              Espace annonceur
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Mes réels</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Suivi du traitement, de la validation et des annonces attachées.
            </p>
          </div>
          <Button
            asChild
            className="h-12 rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] px-6 font-semibold hover:from-[#115a56] hover:to-[#1a9388]"
          >
            <Link href={routes.protected.reels_add}>
              <Video className="mr-2 h-4 w-4" />
              Nouveau réel
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Publiés depuis le</label>
            <Input
              type="date"
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              className={CONTROL_CLASS}
              max={endDateInput || undefined}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Jusqu&apos;au</label>
            <Input
              type="date"
              value={endDateInput}
              onChange={(event) => setEndDateInput(event.target.value)}
              className={CONTROL_CLASS}
              min={startDateInput || undefined}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              {hasActiveFilters ? <X className="mr-2 h-4 w-4" /> : <Filter className="mr-2 h-4 w-4" />}
              Réinitialiser
            </Button>
          </div>
        </div>
      </section>

      {isInitialLoading && (
        <section className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`reel-skeleton-${index}`} className="h-[360px] rounded-2xl" />
          ))}
        </section>
      )}

      {!isInitialLoading && reels.length === 0 && (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <Video className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {hasActiveFilters ? 'Aucun réel sur cette période' : "Vous n'avez encore créé aucun réel"}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? 'Ajustez la période ou réinitialisez le filtre.'
              : 'Publiez une courte vidéo pour mettre en avant un bien.'}
          </p>
          <div className="mt-4 flex justify-center">
            {hasActiveFilters ? (
              <Button variant="outline" className="h-11 rounded-full px-6" onClick={resetFilters}>
                Réinitialiser le filtre
              </Button>
            ) : (
              <Button
                asChild
                className="h-11 rounded-full bg-gradient-to-r from-[#146B67] to-[#1FA89B] px-6 hover:from-[#115a56] hover:to-[#1a9388]"
              >
                <Link href={routes.protected.reels_add}>
                  <Video className="mr-2 h-4 w-4" />
                  Créer un réel
                </Link>
              </Button>
            )}
          </div>
        </section>
      )}

      {reels.length > 0 && (
        <section className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {reels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} onDelete={setReelToDelete} />
          ))}
        </section>
      )}

      <div ref={sentinelRef} className="h-2 w-full" />

      {hasMore && (
        <div className="flex justify-center pb-3">
          <Button
            variant="outline"
            className="h-11 rounded-full border-gray-200 bg-gray-50 px-6 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
            onClick={fetchNextPage}
            disabled={reelsQuery.isFetchingNextPage}
          >
            {reelsQuery.isFetchingNextPage ? 'Chargement…' : 'Voir plus de réels'}
          </Button>
        </div>
      )}

      <Dialog
        open={Boolean(reelToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setReelToDelete(null)
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-gray-200 p-6 dark:border-gray-800" isDefaultIconClose={!isDeleting}>
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
              className="rounded-full"
              onClick={() => setReelToDelete(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
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
    </div>
  )
}
