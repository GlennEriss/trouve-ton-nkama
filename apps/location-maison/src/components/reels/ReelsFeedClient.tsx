'use client'

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Gift, Loader2, PhoneCall, Volume2, VolumeX } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProperty } from '@/hooks/use-property'
import { useUserByUID } from '@/hooks/use-user-by-uid'
import { useTrackPropertyInteraction } from '@/hooks/use-track-property-interaction'
import { cn } from '@/lib/utils'
import type { Reel } from '@/models/reel'
import GiftModal from './gift/GiftModal'

// Mobile : plein écran edge-to-edge (comme l'app TikTok). Desktop (md+) : carte 9:16 centrée
// sur fond sombre façon TikTok/Instagram Reels web, pas une vidéo étirée sur toute la largeur
// de la fenêtre — hauteur choisie pour laisser de la marge sous le navbar desktop (toujours
// affiché, contrairement au mobile) sans avoir besoin de connaître sa hauteur exacte.
const DESKTOP_CARD_CLASS = 'md:h-[75vh] md:max-h-[760px] md:aspect-[9/16] md:w-auto md:rounded-2xl md:border md:border-white/10'

const PAGE_SIZE = 10
// Précharge la page suivante dès qu'il reste peu de réels non affichés — évite un trou/blanc
// en fin de liste chargée pendant que l'utilisateur défile.
const PREFETCH_THRESHOLD = 3

type FeedPage = { reels: (Reel & { id: string })[]; nextCursor: string | null }

async function fetchReelsPage(cursor: string | null): Promise<FeedPage> {
  const params = new URLSearchParams({ limitPerPage: String(PAGE_SIZE) })
  if (cursor) params.set('cursor', cursor)
  const response = await fetch(`/api/reels/feed?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Impossible de charger les réels.')
  }
  return response.json()
}

function trackReelView(reelId: string) {
  const url = `/api/reels/${reelId}/statistics/view`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([], { type: 'application/json' }))
  } else {
    fetch(url, { method: 'POST', keepalive: true }).catch(() => undefined)
  }
}

// Rail d'actions (avatar annonceur + WhatsApp + appel + son). `variant="overlay"` = superposé
// sur la vidéo (mobile, où il n'y a pas de place à côté) ; `variant="sidebar"` = colonne externe
// façon TikTok/Instagram desktop, à droite de la carte vidéo, jamais par-dessus.
function ReelActionRail({
  reel,
  isMuted,
  onToggleMute,
  onGiftClick,
  variant,
}: {
  reel: Reel & { id: string }
  isMuted: boolean
  onToggleMute: () => void
  onGiftClick: () => void
  variant: 'overlay' | 'sidebar'
}) {
  const { data: property } = useProperty(reel.propertyId ?? undefined)
  const { trackInteraction } = useTrackPropertyInteraction(reel.propertyId ?? undefined)
  const { data: owner } = useUserByUID(reel.createdBy)
  const phoneNumber = reel.contact ?? property?.contact ?? owner?.phoneNumbers?.[0] ?? undefined

  const handleWhatsApp = () => {
    if (!phoneNumber) return
    trackInteraction('whatsapp_contact', { phoneNumber })
    const message = property
      ? `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : ${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`
      : `Bonjour, je suis intéressé par votre réel sur Trouve Ton Nkama.`
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCall = () => {
    if (!phoneNumber) return
    trackInteraction('phone_contact', { phoneNumber })
    window.location.href = `tel:${phoneNumber}`
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-5 text-white',
        variant === 'overlay'
          ? 'absolute bottom-24 right-3 z-10 md:hidden'
          : 'hidden md:flex'
      )}
    >
      {owner && (
        <Avatar className="h-11 w-11 border-2 border-white">
          <AvatarImage
            src={owner.image ?? ''}
            alt={[owner.firstname, owner.lastname].filter(Boolean).join(' ')}
          />
          <AvatarFallback className="bg-[#1FA89B] text-sm font-semibold text-white">
            {owner.firstname?.at(0) ?? ''}
          </AvatarFallback>
        </Avatar>
      )}

      <button
        type="button"
        onClick={handleWhatsApp}
        disabled={!phoneNumber}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 disabled:opacity-40"
        aria-label="Contacter via WhatsApp"
      >
        <FaWhatsapp className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={handleCall}
        disabled={!phoneNumber}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm disabled:opacity-40"
        aria-label="Appeler"
      >
        <PhoneCall className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onGiftClick}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-600 text-white"
          aria-label="Offrir un cadeau"
        >
          <Gift className="h-5 w-5" />
        </button>
        {reel.giftCount > 0 && (
          <span className="text-xs font-medium text-white/90">{reel.giftCount}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
        aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  )
}

function ReelSlide({
  reel,
  isActive,
  isMuted,
  onToggleMute,
  onGiftClick,
}: {
  reel: Reel & { id: string }
  isActive: boolean
  isMuted: boolean
  onToggleMute: () => void
  onGiftClick: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  // Un réel peut exister avec ou sans annonce liée (propertyId optionnel) — la légende ne
  // dépend donc pas forcément d'une annonce. `useProperty`/`useUserByUID` sont dédupliqués par
  // React Query avec les mêmes appels dans `ReelActionRail`, donc pas de fetch supplémentaire.
  const { data: property } = useProperty(reel.propertyId ?? undefined)
  // Identité de l'annonceur affichée façon TikTok (avatar + nom) — pas de page profil publique
  // annonceur pour l'instant (routes.protected.profil est privé, propre à l'utilisateur
  // connecté), donc l'avatar reste purement visuel, sans lien.
  const { data: owner } = useUserByUID(reel.createdBy)

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      video.currentTime = 0
      video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [isActive])

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl ?? undefined}
        muted={isMuted}
        loop
        playsInline
        preload={isActive ? 'auto' : 'none'}
        className="h-full w-full object-cover"
        onClick={onToggleMute}
      />

      {/* Dégradé de lisibilité, façon TikTok : couvre toute la largeur pour que le bloc légende
          (gauche) et le rail d'actions (droite) restent lisibles sur n'importe quelle vidéo. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-64 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      {/* Bloc légende en bas à gauche : identité de l'annonceur + infos annonce. Sur mobile, le
          rail d'actions est superposé (right-20) ; sur desktop il est sorti à côté de la carte
          (voir ReelActionRail variant="sidebar" dans ReelsFeedClient), donc plus besoin de lui
          réserver de la place (md:pr-4). Plus de bottom nav sur desktop (md:pb-6). */}
      <div className="absolute inset-x-4 bottom-0 z-10 pb-24 pr-20 text-white md:pb-6 md:pr-4">
        {owner && (
          <p className="font-semibold">
            {[owner.firstname, owner.lastname].filter(Boolean).join(' ')}
          </p>
        )}
        {property ? (
          <>
            <p className="mt-1 line-clamp-2 text-sm text-white/90">{property.title}</p>
            <p className="mt-1 text-sm font-medium text-white/80">
              {property.price.toLocaleString('fr-FR')} FCFA · {property.city}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-white/70">Réel</p>
        )}
      </div>

      <ReelActionRail reel={reel} isMuted={isMuted} onToggleMute={onToggleMute} onGiftClick={onGiftClick} variant="overlay" />
    </div>
  )
}

export default function ReelsFeedClient() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isMuted, setIsMuted] = React.useState(true)
  // Réel ciblé par le modal cadeau — état au niveau du feed car le bouton
  // existe dans les deux rails (overlay mobile dans ReelSlide + sidebar desktop ici).
  const [giftReel, setGiftReel] = React.useState<(Reel & { id: string }) | null>(null)
  const trackedViewsRef = React.useRef<Set<string>>(new Set())

  const feedQuery = useInfiniteQuery({
    queryKey: ['reels-feed'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchReelsPage(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const reels = React.useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.reels) ?? [],
    [feedQuery.data?.pages]
  )

  React.useEffect(() => {
    if (!api) return

    const onSelect = () => setActiveIndex(api.selectedScrollSnap())
    api.on('select', onSelect)
    onSelect()

    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  React.useEffect(() => {
    const activeReel = reels[activeIndex]
    if (!activeReel) return

    if (!trackedViewsRef.current.has(activeReel.id)) {
      trackedViewsRef.current.add(activeReel.id)
      trackReelView(activeReel.id)
    }

    if (
      reels.length - activeIndex <= PREFETCH_THRESHOLD &&
      feedQuery.hasNextPage &&
      !feedQuery.isFetchingNextPage
    ) {
      void feedQuery.fetchNextPage()
    }
  }, [activeIndex, reels, feedQuery])

  if (feedQuery.isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black md:h-auto md:bg-neutral-950 md:py-8">
        <div className={cn('flex h-full w-full items-center justify-center bg-black', DESKTOP_CARD_CLASS)}>
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black md:h-auto md:bg-neutral-950 md:py-8">
        <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-white', DESKTOP_CARD_CLASS)}>
          <p className="font-medium">Aucun réel pour le moment</p>
          <p className="text-sm text-white/60">Revenez bientôt !</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black md:h-auto md:gap-4 md:bg-neutral-950 md:py-8">
      <div className={cn('relative h-full w-full overflow-hidden md:shadow-2xl', DESKTOP_CARD_CLASS)}>
        <Carousel
          orientation="vertical"
          opts={{ axis: 'y', loop: false }}
          setApi={setApi}
          className="h-full w-full"
        >
          <CarouselContent className="ml-0 h-full">
            {reels.map((reel, index) => (
              <CarouselItem key={reel.id} className="pl-0 basis-full">
                <ReelSlide
                  reel={reel}
                  isActive={index === activeIndex}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted((m) => !m)}
                  onGiftClick={() => setGiftReel(reel)}
                />
              </CarouselItem>
            ))}
            {feedQuery.isFetchingNextPage && (
              <CarouselItem className="pl-0 basis-full">
                <div className="flex h-full items-center justify-center bg-black">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Rail d'actions desktop — sorti à côté de la carte façon TikTok web (jamais superposé à
          la vidéo, contrairement au variant "overlay" utilisé dans ReelSlide sur mobile). Reflète
          le réel actuellement actif dans le carousel. */}
      {reels[activeIndex] && (
        <ReelActionRail
          reel={reels[activeIndex]}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          onGiftClick={() => setGiftReel(reels[activeIndex])}
          variant="sidebar"
        />
      )}

      <GiftModal
        isOpen={giftReel !== null}
        onClose={() => setGiftReel(null)}
        reelId={giftReel?.id ?? ''}
      />

      {/* Boutons précédent/suivant façon TikTok desktop web — sur mobile le swipe suffit,
          ces boutons n'ont de sens qu'à côté de la carte, place que le plein écran mobile n'a pas. */}
      <div className="hidden md:flex md:flex-col md:gap-3">
        <button
          type="button"
          onClick={() => api?.scrollPrev()}
          disabled={activeIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
          aria-label="Réel précédent"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => api?.scrollNext()}
          disabled={activeIndex >= reels.length - 1 && !feedQuery.hasNextPage}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"
          aria-label="Réel suivant"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
