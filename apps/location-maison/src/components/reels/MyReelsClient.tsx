'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Eye,
  Filter,
  Heart,
  Link2,
  Loader2,
  Pencil,
  Play,
  Search,
  Share2,
  Trash2,
  Video,
  X,
  XCircle,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { deleteReel, getReelsByOwner } from '@/db/reel.db'
import { Card } from '@trouve-ton-nkama/ui/card'
import { Button } from '@trouve-ton-nkama/ui/button'
import { Input } from '@trouve-ton-nkama/ui/input'
import { Skeleton } from '@trouve-ton-nkama/ui/skeleton'
import { Carousel, CarouselContent, CarouselItem } from '@trouve-ton-nkama/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trouve-ton-nkama/ui/dialog'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@trouve-ton-nkama/ui/sheet'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'
import { useToast } from '@/hooks/use-toast'
import type { Reel, ReelProcessingStatus } from '@/models/reel'

const REELS_PAGE_SIZE = 12
const REELS_QUERY_KEY = 'reels-mine'
const CREATE_REEL_FROM_MINE_HREF = `${routes.protected.reels_add}?returnTo=${encodeURIComponent(routes.protected.reels_mine)}`

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
  'h-12 rounded-full border border-gray-200 bg-gray-50 px-4 text-sm shadow-none transition-colors focus-visible:border-secondary focus-visible:ring-0 dark:border-gray-700 dark:bg-gray-800/70'

// Même normalisation que matchesQuery dans /api/announcer/ads/route.ts (recherche insensible
// à la casse et aux accents) — cohérent avec la recherche de /property, mais appliquée ici
// côté client sur les réels déjà chargés (pas de recherche plein texte côté serveur pour les
// réels, contrairement aux annonces).
function normalizeText(value: string | undefined | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

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

function formatStat(value: number | undefined) {
  return (value ?? 0).toLocaleString('fr-FR')
}

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
      {/* 9/16, pas 4/5 : les réels sont des vidéos verticales dans ce ratio (voir
          ReelsFeedClient.tsx/SingleReelClient.tsx, le vrai lecteur). Une miniature 9/16 affichée
          dans un cadre 4/5 (plus large par rapport à sa hauteur) forçait `object-cover` à
          recadrer bien plus que nécessaire pour remplir la largeur — l'aperçu semblait "zoomé",
          montrant une tranche centrale de la vidéo au lieu du cadrage réel. */}
      {(() => {
        // Lisible seulement une fois traité + approuvé : /reels/[reelId] (SingleReelClient.tsx)
        // n'affiche que ce que getPublicReelById() renvoie (processingStatus 'ready' +
        // moderationStatus 'APPROVED', voir reel.db.ts) — cliquer la miniature d'un réel encore
        // en cours d'envoi/traitement ou rejeté afficherait à tort "n'est plus disponible". Le
        // badge de statut déjà affiché ici suffit à expliquer pourquoi ce n'est pas encore
        // cliquable.
        const isPlayable = reel.processingStatus === 'ready'
        const media = (
          <>
            {reel.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="h-10 w-10 text-gray-400" />
              </div>
            )}
            {isPlayable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-gray-900 opacity-90 shadow-lg transition-transform group-hover:scale-110 group-hover:opacity-100">
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </span>
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
          </>
        )

        return isPlayable ? (
          // returnTo : sans lui, "Voir plus de réels" sur /reels/{id} (SingleReelClient.tsx)
          // ramènerait vers le fil public /reels au lieu de cette page de gestion.
          <Link
            href={`/reels/${reel.id}?returnTo=${encodeURIComponent(routes.protected.reels_mine)}`}
            className="group relative block aspect-[9/16] w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
            aria-label="Lire le réel"
          >
            {media}
          </Link>
        ) : (
          <div className="relative aspect-[9/16] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            {media}
          </div>
        )
      })()}

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="space-y-1.5">
          <p className="line-clamp-1 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            <Link2 className="h-3.5 w-3.5 text-primary" />
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

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center dark:border-gray-800 dark:bg-gray-800/40">
            <Eye className="mx-auto h-4 w-4 text-primary" />
            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatStat(reel.viewCount)}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Vues</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center dark:border-gray-800 dark:bg-gray-800/40">
            <Heart className="mx-auto h-4 w-4 text-rose-600" />
            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatStat(reel.likeCount)}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Likes</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2 text-center dark:border-gray-800 dark:bg-gray-800/40">
            <Share2 className="mx-auto h-4 w-4 text-sky-600" />
            <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatStat(reel.shareCount)}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Partages</p>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-full" asChild>
              <Link href={`/reels/${reel.id}/edit`}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Modifier
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
              onClick={() => onDelete(reel)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Supprimer
            </Button>
          </div>
          {!reel.propertyId && (
            <Button variant="outline" className="h-11 w-full rounded-full" asChild>
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

type ReelStatCardProps = {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

function ReelStatCard({ title, value, icon: Icon, iconBg, iconColor }: Readonly<ReelStatCardProps>) {
  return (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBg, iconColor)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatStat(value)}</p>
        </div>
      </div>
    </div>
  )
}

export default function MyReelsClient() {
  const { user, isFirebaseConnected } = useCurrentUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reelToDelete, setReelToDelete] = useState<ReelWithId | null>(null)
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const startDate = useMemo(() => parseDateInput(startDateInput), [startDateInput])
  const endDate = useMemo(() => {
    const parsed = parseDateInput(endDateInput)
    return parsed ? endOfDay(parsed) : null
  }, [endDateInput])

  const hasActiveFilters = Boolean(startDateInput || endDateInput || searchInput)

  const reelsQuery = useInfiniteQuery({
    queryKey: [REELS_QUERY_KEY, user?.uid, startDateInput, endDateInput],
    enabled: Boolean(user?.uid && isFirebaseConnected),
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

  // Réels réellement chargés depuis le serveur (pagination infinie, indépendante de la
  // recherche ci-dessous) vs ceux effectivement affichés une fois le texte de recherche
  // appliqué. Contrairement à /property (dont /api/announcer/ads charge tout puis filtre côté
  // serveur), il n'y a pas de recherche plein texte côté serveur pour les réels — la recherche
  // ne porte donc que sur les pages déjà chargées, comme "Voir plus de réels" ci-dessous.
  const loadedReels = useMemo(
    () => reelsQuery.data?.pages.flatMap((page) => page.reels) ?? [],
    [reelsQuery.data?.pages]
  )
  const normalizedSearch = useMemo(() => normalizeText(searchInput.trim()), [searchInput])
  const reels = useMemo(
    () =>
      normalizedSearch
        ? loadedReels.filter((reel) => normalizeText(reel.description).includes(normalizedSearch))
        : loadedReels,
    [loadedReels, normalizedSearch]
  )
  const totalStats = useMemo(
    () => reels.reduce(
      (acc, reel) => ({
        views: acc.views + (reel.viewCount ?? 0),
        likes: acc.likes + (reel.likeCount ?? 0),
        shares: acc.shares + (reel.shareCount ?? 0),
      }),
      { views: 0, likes: 0, shares: 0 }
    ),
    [reels]
  )
  // Réutilisé tel quel dans la grille desktop ET le carousel mobile ci-dessous — même pattern
  // que statCards dans AdManagementPage.tsx (/property).
  const reelStatCards = useMemo(
    () => [
      { key: 'views', title: 'Vues totales', value: totalStats.views, icon: Eye, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-primary' },
      { key: 'likes', title: 'Likes reçus', value: totalStats.likes, icon: Heart, iconBg: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600' },
      { key: 'shares', title: 'Partages', value: totalStats.shares, icon: Share2, iconBg: 'bg-sky-50 dark:bg-sky-950/30', iconColor: 'text-sky-600' },
    ],
    [totalStats]
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
    setSearchInput('')
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
  const waitingForFirebase = Boolean(user?.uid && !isFirebaseConnected)
  const isInitialLoading = waitingForFirebase || reelsQuery.isLoading

  return (
    <div className="space-y-6 px-4 pb-20 pt-2 md:px-0 md:pb-8">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="group -ml-2 mb-2 h-11">
              <Link href={routes.protected.properties}>
                <ArrowLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
                Mes annonces
              </Link>
            </Button>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Video className="h-3.5 w-3.5" />
              Espace annonceur
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">Mes réels</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Suivi du traitement, de la validation, des vues, des likes et des partages.
            </p>
          </div>
          <Button
            asChild
            className="h-12 rounded-full bg-gradient-to-r from-primary to-secondary px-6 font-semibold hover:from-primary-800 hover:to-primary-600"
          >
            <Link href={CREATE_REEL_FROM_MINE_HREF}>
              <Video className="mr-2 h-4 w-4" />
              Nouveau réel
            </Link>
          </Button>
        </div>
      </section>

      {!isInitialLoading && reels.length > 0 && (
        <>
          {/* Mobile (<md) : carousel horizontal — même pattern que les stats de /property
              (AdManagementPage.tsx), pour ne pas empiler 3 cartes en pleine largeur avant même
              d'atteindre la recherche/les filtres. Desktop (>=md) : grille, inchangée. */}
          <div className="md:hidden" data-testid="reel-stats-mobile">
            <Carousel opts={{ align: 'start', dragFree: true }}>
              <CarouselContent className="-ml-3">
                {reelStatCards.map((stat) => (
                  <CarouselItem key={stat.key} className="basis-[42%] pl-3">
                    <ReelStatCard
                      title={stat.title}
                      value={stat.value}
                      icon={stat.icon}
                      iconBg={stat.iconBg}
                      iconColor={stat.iconColor}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <div className="hidden grid-cols-1 gap-3 sm:grid-cols-3 md:grid" data-testid="reel-stats-desktop">
            {reelStatCards.map((stat) => (
              <ReelStatCard
                key={stat.key}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                iconBg={stat.iconBg}
                iconColor={stat.iconColor}
              />
            ))}
          </div>
        </>
      )}

      {/* Mobile (<md) : barre compacte recherche + bouton filtres ouvrant un Sheet — même
          design que /property (AdManagementPage.tsx) pour une expérience cohérente entre les
          deux espaces de gestion de l'annonceur. Desktop (>=md) : section complète ci-dessous. */}
      <section className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="reels-search-mobile"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Rechercher dans la description..."
            className={`${CONTROL_CLASS} bg-white pl-10 pr-10 dark:bg-gray-900`}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Filtres"
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <Filter className="h-5 w-5" />
              {hasActiveFilters && (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="flex h-[85vh] flex-col rounded-t-2xl px-4 pb-4">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              <div>
                <label htmlFor="mobile-reels-start-date" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Publiés depuis le</label>
                <Input
                  id="mobile-reels-start-date"
                  type="date"
                  value={startDateInput}
                  onChange={(event) => setStartDateInput(event.target.value)}
                  className={CONTROL_CLASS}
                  max={endDateInput || undefined}
                />
              </div>
              <div>
                <label htmlFor="mobile-reels-end-date" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Jusqu&apos;au</label>
                <Input
                  id="mobile-reels-end-date"
                  type="date"
                  value={endDateInput}
                  onChange={(event) => setEndDateInput(event.target.value)}
                  className={CONTROL_CLASS}
                  min={startDateInput || undefined}
                />
              </div>
            </div>
            <SheetFooter className="flex-row gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-full border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                Réinitialiser
              </Button>
              <SheetClose asChild>
                <Button className="h-12 flex-1 rounded-full">
                  Voir les résultats
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </section>

      <section className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block md:p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="reels-search" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Recherche</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-gray-400" />
              <Input
                id="reels-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Rechercher dans la description..."
                className={`${CONTROL_CLASS} pl-10 pr-10`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="reels-start-date" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Publiés depuis le</label>
            <Input
              id="reels-start-date"
              type="date"
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              className={CONTROL_CLASS}
              max={endDateInput || undefined}
            />
          </div>
          <div>
            <label htmlFor="reels-end-date" className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Jusqu&apos;au</label>
            <Input
              id="reels-end-date"
              type="date"
              value={endDateInput}
              onChange={(event) => setEndDateInput(event.target.value)}
              className={CONTROL_CLASS}
              min={startDateInput || undefined}
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            className="h-12 rounded-full border-gray-200 bg-gray-50 px-6 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            <Filter className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
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
            {hasActiveFilters ? 'Aucun réel ne correspond à vos filtres' : "Vous n'avez encore créé aucun réel"}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? 'Ajustez la recherche ou la période, ou réinitialisez les filtres.'
              : 'Publiez une courte vidéo pour mettre en avant un bien.'}
          </p>
          <div className="mt-4 flex justify-center">
            {hasActiveFilters ? (
              <Button variant="outline" className="h-11 rounded-full px-6" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : (
              <Button
                asChild
                className="h-11 rounded-full bg-gradient-to-r from-primary to-secondary px-6 hover:from-primary-800 hover:to-primary-600"
              >
                <Link href={CREATE_REEL_FROM_MINE_HREF}>
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
