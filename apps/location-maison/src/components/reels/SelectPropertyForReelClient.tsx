'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, MapPin, Search, Video, X } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { searchOwnedProperties } from '@/db/property.db'
import { attachReelToProperty } from '@/db/reel.db'
import { resolveThumbnailUrl } from '@/lib/property-images'
import { resolveListingScopeLabel } from '@/lib/listing-scope'
import { Button } from '@trouve-ton-nkama/ui/button'
import { Card } from '@trouve-ton-nkama/ui/card'
import { Input } from '@trouve-ton-nkama/ui/input'
import { useToast } from '@/hooks/use-toast'
import { routes } from '@/constantes/routes'
import type { Property } from '@/models/annonce'

const PAGE_SIZE = 20
// Même délai que "Gestion des annonces" (useAdManagement.ts) — laisse le temps de finir de
// taper avant d'interroger le serveur à chaque frappe.
const SEARCH_DEBOUNCE_MS = 350

export default function SelectPropertyForReelClient() {
  const { user } = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const attachReelId = searchParams.get('attachReelId')
  const [attachingId, setAttachingId] = React.useState<string | null>(null)
  const noPropertyHref = attachReelId ? routes.protected.reels_mine : routes.protected.reels_add

  const [searchInput, setSearchInput] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  // Paginé (pas tout chargé d'un coup) + recherche côté serveur (/api/announcer/ads, même
  // route que "Gestion des annonces") : un annonceur avec des centaines d'annonces doit pouvoir
  // en retrouver une précise sans que cette page ne les charge toutes.
  const propertiesQuery = useInfiniteQuery({
    queryKey: ['properties', 'select-for-reel', user?.uid, debouncedSearch],
    queryFn: ({ pageParam }) =>
      searchOwnedProperties({ query: debouncedSearch, limitPerPage: PAGE_SIZE, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(user?.uid),
  })

  const properties = React.useMemo(
    () => propertiesQuery.data?.pages.flatMap((page) => page.properties) ?? [],
    [propertiesQuery.data]
  )
  const hasMore = Boolean(propertiesQuery.hasNextPage)
  const isInitialLoading = propertiesQuery.isLoading

  const fetchNextPage = React.useCallback(() => {
    if (!propertiesQuery.hasNextPage || propertiesQuery.isFetchingNextPage) return
    void propertiesQuery.fetchNextPage()
  }, [propertiesQuery])

  React.useEffect(() => {
    const element = sentinelRef.current
    if (!element || !hasMore || propertiesQuery.isFetchingNextPage) return

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
  }, [fetchNextPage, hasMore, propertiesQuery.isFetchingNextPage])

  const handleSelect = async (property: Property & { id: string }) => {
    if (!attachReelId) {
      router.push(`${routes.protected.reels_add}?propertyId=${property.id}`)
      return
    }

    setAttachingId(property.id)
    try {
      const ok = await attachReelToProperty(attachReelId, property.id)
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id="select-property-search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Rechercher une annonce par titre, ville..."
          className="h-11 rounded-full bg-white pl-10 pr-10 dark:bg-gray-900"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute right-0.5 top-0.5 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
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

      {isInitialLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!isInitialLoading && properties.length === 0 && (
        <p className="text-sm text-slate-500">
          {debouncedSearch
            ? "Aucune annonce ne correspond à votre recherche."
            : "Vous n'avez aucune annonce publiée pour le moment."}
        </p>
      )}

      <div className="space-y-3">
        {properties.map((property) => {
          const scope = resolveListingScopeLabel(property)
          return (
            <Card
              key={property.id}
              data-testid="select-property-card"
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
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{property.title}</p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <scope.icon className="h-3 w-3" />
                    {scope.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {property.city}
                </p>
              </div>
              {attachingId === property.id && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
            </Card>
          )
        })}
      </div>

      <div ref={sentinelRef} className="h-2 w-full" />

      {hasMore && (
        <div className="flex justify-center pb-3">
          <Button
            variant="outline"
            className="h-11 rounded-full"
            onClick={fetchNextPage}
            disabled={propertiesQuery.isFetchingNextPage}
          >
            {propertiesQuery.isFetchingNextPage ? 'Chargement…' : 'Voir plus d\'annonces'}
          </Button>
        </div>
      )}
    </div>
  )
}
