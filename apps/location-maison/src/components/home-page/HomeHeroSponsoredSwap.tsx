'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import AdCreativeCard from '@/components/ads/AdCreativeCard'
import type { AdCreativePublic } from '@/models/advertising'

type HomeHeroSponsoredSwapProps = Readonly<{
  reduceMotion?: boolean | null
}>

const SLIDE_DURATION_MS = 7000

type HeroSlide =
  | Readonly<{ kind: 'platform' }>
  | Readonly<{ kind: 'sponsored'; creative: AdCreativePublic }>

function track(event: 'impression' | 'click', campaignId: string) {
  try {
    const body = JSON.stringify({ event, campaignId })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/advertising/track', new Blob([body], { type: 'application/json' }))
      return
    }
    fetch('/api/advertising/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* tracking best-effort */
  }
}

const slideVariants: Variants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
}

function PlatformHero({ reduceMotion }: Readonly<{ reduceMotion?: boolean | null }>) {
  return (
    <div className="absolute inset-0 p-8">
      <div className="flex h-full xl:items-center">
        <div className="flex max-w-3xl flex-col gap-3 lg:gap-5 xl:ml-10">
          <span className="text-base font-medium text-[#146B67]">
            La référence immobilière au Gabon
          </span>
          <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
            Trouvez <br className="lg:hidden" /> le logement idéal ou <br />
            <span className="text-[#146B67]">développez<br /> votre activité immobilière</span>
          </h1>
          <p className="text-base text-gray-700">
            La première plateforme digitale <br />
            qui révolutionne l&apos;immobilier au Gabon
          </p>
        </div>
      </div>
      <motion.div
        className="absolute -bottom-10 right-0 lg:-bottom-20"
        animate={reduceMotion ? {} : { y: [0, -8, 0] }}
        transition={
          reduceMotion
            ? {}
            : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <Image
          src="/assets/home-page/Group-2.webp"
          alt="Trouve Ton Nkama"
          width={0}
          height={0}
          className="h-[350px] w-[350px] object-contain lg:h-[450px] lg:w-[450px] xl:h-[550px] xl:w-[550px]"
          priority
        />
      </motion.div>
    </div>
  )
}

function SponsoredHero({ creative }: Readonly<{ creative: AdCreativePublic }>) {
  return (
    <div className="absolute inset-0 p-6 xl:p-8">
      <div className="flex h-full items-center justify-center">
        <AdCreativeCard
          creative={creative}
          placement="home"
          surface="none"
          fillHeight
          interactive
          onClick={() => track('click', creative.campaignId)}
          className="home-hero-sponsored-slot h-full w-full overflow-hidden rounded-xl [&_a]:h-full"
        />
      </div>
    </div>
  )
}

export default function HomeHeroSponsoredSwap({ reduceMotion }: HomeHeroSponsoredSwapProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [creatives, setCreatives] = useState<AdCreativePublic[]>([])
  const impressionsSent = useRef<Set<string>>(new Set())
  const slides: HeroSlide[] = [
    { kind: 'platform' },
    ...creatives.map((creative) => ({ kind: 'sponsored' as const, creative })),
  ]
  const activeSlide = slides[activeIndex] ?? slides[0]
  const activeSlideKey =
    activeSlide.kind === 'sponsored' ? activeSlide.creative.campaignId : 'platform'

  // Récupère toutes les pubs maison de l'accueil. La home est un vrai slider :
  // chaque campagne active doit pouvoir défiler, pas seulement la priorité haute.
  useEffect(() => {
    let cancelled = false
    fetch('/api/advertising/active?placement=home&all=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setCreatives(Array.isArray(data?.creatives) ? data.creatives : [])
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // La rotation ne démarre que s'il existe au moins une pub à montrer.
  useEffect(() => {
    if (reduceMotion || slides.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, SLIDE_DURATION_MS)

    return () => window.clearInterval(interval)
  }, [reduceMotion, slides.length])

  // Si la liste change, on évite un index hors limites.
  useEffect(() => {
    setActiveIndex((current) => (current >= slides.length ? 0 : current))
  }, [slides.length])

  // Impression comptée une fois par campagne quand sa slide apparaît.
  useEffect(() => {
    if (activeSlide.kind === 'sponsored' && !impressionsSent.current.has(activeSlide.creative.campaignId)) {
      impressionsSent.current.add(activeSlide.creative.campaignId)
      track('impression', activeSlide.creative.campaignId)
    }
  }, [activeSlide])

  return (
    <section className="relative mt-5 h-[330px] overflow-hidden rounded-xl bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] xl:h-[430px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlideKey}
          className="absolute inset-0"
          variants={slideVariants}
          initial={reduceMotion ? false : 'enter'}
          animate="center"
          exit={reduceMotion ? undefined : 'exit'}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeSlide.kind === 'sponsored' ? (
            <SponsoredHero creative={activeSlide.creative} />
          ) : (
            <PlatformHero reduceMotion={reduceMotion} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
