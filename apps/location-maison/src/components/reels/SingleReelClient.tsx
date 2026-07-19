'use client'

/**
 * Vue "réel unique" — lien profond ouvert depuis le message WhatsApp de contact
 * (bouton "Contacter via WhatsApp" du fil, apps/../ReelsFeedClient.tsx) pour que
 * l'annonceur sache précisément à quel réel l'acheteur fait référence. Réutilise
 * ReelSlide (même rendu que dans le fil), sans carousel/scroll infini : le lien
 * pointe sur UN réel, pas un point d'entrée dans le flux général.
 */

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { routes } from '@/constantes/routes'
import type { Reel } from '@/models/reel'
import { ReelSlide } from './ReelsFeedClient'
import GiftModal from './gift/GiftModal'
import { trackReelView } from '@/lib/statistics/reel-statistics.client'

const DESKTOP_CARD_CLASS = 'md:h-[75vh] md:max-h-[760px] md:aspect-[9/16] md:w-auto md:rounded-2xl md:border md:border-white/10'

type FetchState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; reel: Reel & { id: string } }

export default function SingleReelClient({ reelId }: Readonly<{ reelId: string }>) {
  const [state, setState] = React.useState<FetchState>({ status: 'loading' })
  const [isMuted, setIsMuted] = React.useState(true)
  const [giftOpen, setGiftOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetch(`/api/reels/${encodeURIComponent(reelId)}`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setState({ status: 'not-found' })
          return
        }
        if (!res.ok) {
          setState({ status: 'error' })
          return
        }
        const data = (await res.json()) as { reel: Reel & { id: string } }
        setState({ status: 'ready', reel: data.reel })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [reelId])

  React.useEffect(() => {
    if (state.status === 'ready') trackReelView(state.reel.id)
  }, [state])

  return (
    <main className="flex h-[100dvh] w-full items-center justify-center bg-black md:h-auto md:gap-4 md:bg-neutral-950 md:py-8">
      <div className={cn('relative h-full w-full overflow-hidden md:shadow-2xl', DESKTOP_CARD_CLASS)}>
        <Link
          href={routes.protected.reels}
          className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-black/45 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm"
          aria-label="Retour au fil"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voir plus de réels
        </Link>

        {state.status === 'loading' && (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
          </div>
        )}

        {state.status === 'not-found' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white">
            <p className="font-medium">Ce réel n&apos;est plus disponible.</p>
            <p className="text-sm text-white/60">Il a peut-être été supprimé ou n&apos;est pas encore approuvé.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black px-6 text-center text-white">
            <p className="font-medium">Impossible de charger ce réel.</p>
            <p className="text-sm text-white/60">Réessaie dans un instant.</p>
          </div>
        )}

        {state.status === 'ready' && (
          <ReelSlide
            reel={state.reel}
            isActive
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            onGiftClick={() => setGiftOpen(true)}
          />
        )}
      </div>

      {state.status === 'ready' && (
        <GiftModal isOpen={giftOpen} onClose={() => setGiftOpen(false)} reelId={state.reel.id} />
      )}
    </main>
  )
}
