'use client'

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2, PhoneCall, Volume2, VolumeX } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { useProperty } from '@/hooks/use-property'
import { useTrackPropertyInteraction } from '@/hooks/use-track-property-interaction'
import type { Reel } from '@/models/reel'

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

function ReelSlide({
  reel,
  isActive,
  isMuted,
  onToggleMute,
}: {
  reel: Reel & { id: string }
  isActive: boolean
  isMuted: boolean
  onToggleMute: () => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  // La vidéo n'a de sens que rattachée à une annonce pour l'instant : contact WhatsApp/appel
  // réutilise tel quel le tracking existant des annonces (téléphone, message, compteurs) —
  // pas de nouvelle infra de tracking pour les réels orphelins, hors scope de cette étape
  // (voir plan). Un réel orphelin s'affiche donc sans boutons de contact.
  const { data: property } = useProperty(reel.propertyId ?? undefined)
  const { trackInteraction } = useTrackPropertyInteraction(reel.propertyId ?? undefined)

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

  const phoneNumber = property?.contact ?? undefined

  const handleWhatsApp = () => {
    if (!phoneNumber || !property) return
    trackInteraction('whatsapp_contact', { phoneNumber })
    const message = `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${property.price.toLocaleString('fr-FR')} FCFA. Voici le lien de l'annonce : ${process.env.NEXT_PUBLIC_HOST}/houseDetails/${property.id}`
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCall = () => {
    if (!phoneNumber) return
    trackInteraction('phone_contact', { phoneNumber })
    window.location.href = `tel:${phoneNumber}`
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
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

      <button
        type="button"
        onClick={onToggleMute}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      {property && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-8 text-white">
          <div className="min-w-0">
            <p className="font-semibold truncate">{property.title}</p>
            <p className="text-sm text-white/80">
              {property.price.toLocaleString('fr-FR')} FCFA · {property.city}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm disabled:opacity-40"
              aria-label="Appeler"
            >
              <PhoneCall className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReelsFeedClient() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isMuted, setIsMuted] = React.useState(true)
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
      <div className="flex h-[100dvh] items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-2 bg-black text-white">
        <p className="font-medium">Aucun réel pour le moment</p>
        <p className="text-sm text-white/60">Revenez bientôt !</p>
      </div>
    )
  }

  return (
    <Carousel
      orientation="vertical"
      opts={{ axis: 'y', loop: false }}
      setApi={setApi}
      className="h-[100dvh] w-full"
    >
      <CarouselContent className="ml-0 h-[100dvh]">
        {reels.map((reel, index) => (
          <CarouselItem key={reel.id} className="pl-0 basis-full">
            <ReelSlide
              reel={reel}
              isActive={index === activeIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
            />
          </CarouselItem>
        ))}
        {feedQuery.isFetchingNextPage && (
          <CarouselItem className="pl-0 basis-full">
            <div className="flex h-[100dvh] items-center justify-center bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </CarouselItem>
        )}
      </CarouselContent>
    </Carousel>
  )
}
