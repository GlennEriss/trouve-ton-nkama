'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import SponsoredSlot from '@/components/ads/SponsoredSlot'
import { ADSENSE_SLOTS } from '@/lib/ads/config'

type HomeHeroSponsoredSwapProps = Readonly<{
  reduceMotion?: boolean | null
}>

const SLIDE_DURATION_MS = 7000

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

function SponsoredHero() {
  return (
    <div className="absolute inset-0 p-6 xl:p-8">
      <div className="flex h-full items-center justify-center">
        <SponsoredSlot
          placement="home"
          surface="none"
          fallbackSlot={ADSENSE_SLOTS.footer}
          fallbackSlotKey="home-desktop-hero"
          fallbackCompact
          className="home-hero-sponsored-slot h-full w-full overflow-hidden rounded-xl [&_a]:h-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover"
        />
      </div>
    </div>
  )
}

export default function HomeHeroSponsoredSwap({ reduceMotion }: HomeHeroSponsoredSwapProps) {
  const [activeSlide, setActiveSlide] = useState<'platform' | 'sponsored'>('platform')

  useEffect(() => {
    if (reduceMotion) return

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current === 'platform' ? 'sponsored' : 'platform'))
    }, SLIDE_DURATION_MS)

    return () => window.clearInterval(interval)
  }, [reduceMotion])

  return (
    <section className="relative mt-5 h-[330px] overflow-hidden rounded-xl bg-gradient-to-r from-[#C1DEE8] to-[#FBD9B9] xl:h-[430px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          className="absolute inset-0"
          variants={slideVariants}
          initial={reduceMotion ? false : 'enter'}
          animate="center"
          exit={reduceMotion ? undefined : 'exit'}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeSlide === 'platform' ? (
            <PlatformHero reduceMotion={reduceMotion} />
          ) : (
            <SponsoredHero />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
