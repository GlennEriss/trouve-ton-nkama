'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { routes } from '@/constantes/routes'
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking'

const VOICEOVER_TRANSCRIPT =
  "Vous avez un commerce, un service ou une activité au Gabon ? Votre prochain client est peut-être déjà sur Trouve Ton Nkama. Faites connaître votre offre auprès d'un public local, avec des tarifs accessibles à partir de trois mille sept cent cinquante francs CFA. Depuis l'espace Publicités, choisissez votre formule et vos emplacements. Pour apparaître dans les Réels, sélectionnez le forfait Réels puis ajoutez votre vidéo verticale. Écrivez une accroche claire, ajoutez votre description et votre lien WhatsApp. Avant de publier, vous voyez exactement comment votre publicité apparaîtra. Après diffusion, suivez vos vues et vos clics depuis votre tableau de bord. Prêt à développer votre visibilité au Gabon ? Créez votre publicité maintenant sur tonnkama.com."

export default function PubliciteVideoSection() {
  const shouldReduceMotion = useReducedMotion()
  const { trackEvent } = useTrackEvent()
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hasTrackedStart = useRef(false)

  const [isNearViewport, setIsNearViewport] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)

  // Ne charge la vidéo (même en preload="metadata") qu'une fois la section proche de l'écran —
  // avant ça, seule l'image d'affiche est présente dans le DOM, aucun octet vidéo n'est demandé.
  useEffect(() => {
    const node = sectionRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handlePlayClick = () => {
    videoRef.current?.play().catch(() => {
      // Lecture bloquée par le navigateur (rare, vidéo jamais en autoplay) — l'utilisateur peut
      // réessayer via les contrôles natifs qui restent visibles.
    })
  }

  const handlePlay = () => {
    setHasStartedPlaying(true)
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackEvent(trackingEvents.PUBLICITE_VIDEO_STARTED)
    }
  }

  const handleEnded = () => {
    setHasEnded(true)
    trackEvent(trackingEvents.PUBLICITE_VIDEO_COMPLETED)
  }

  return (
    <section id="video" ref={sectionRef} className="mx-auto max-w-2xl px-5 py-16 sm:py-20">
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Découvrez comment lancer votre publicité
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-600 dark:text-gray-300">
          En moins d&apos;une minute, découvrez les formats disponibles, la création d&apos;une
          campagne et la façon dont votre publicité apparaît sur Trouve Ton Nkama.
        </p>
      </motion.div>

      <motion.div
        id="video-player"
        initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
        whileInView={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative mx-auto mt-10 aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-3xl bg-ink shadow-2xl"
      >
        {isNearViewport && (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            poster="/videos/publicite/poster.jpg"
            preload="metadata"
            controls={hasStartedPlaying}
            playsInline
            onPlay={handlePlay}
            onEnded={handleEnded}
          >
            <source src="/videos/publicite/video-11.mp4" type="video/mp4" />
            <track
              kind="captions"
              srcLang="fr"
              src="/videos/publicite/video-11.fr.vtt"
              label="Français"
              default
            />
          </video>
        )}

        {!isNearViewport && (
          <Image
            src="/videos/publicite/poster.jpg"
            alt="Aperçu de la vidéo de présentation de Trouve Ton Nkama Publicité"
            fill
            sizes="320px"
            className="object-cover"
          />
        )}

        {!hasStartedPlaying && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label="Lire la vidéo de présentation"
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <Play className="ml-1 h-7 w-7 text-secondary" fill="currentColor" />
            </span>
          </button>
        )}
      </motion.div>

      {hasEnded && (
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Link
            href={routes.protected.advertising_create}
            onClick={() =>
              trackEvent(trackingEvents.PUBLICITE_CTA_CLICKED, { position: 'video_end' })
            }
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-secondary px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-600"
          >
            Créer ma publicité
          </Link>
        </motion.div>
      )}

      <details className="mx-auto mt-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-4 text-left dark:border-gray-700 dark:bg-gray-900">
        <summary className="cursor-pointer select-none text-sm font-semibold text-ink dark:text-white">
          Transcription textuelle de la vidéo
        </summary>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {VOICEOVER_TRANSCRIPT}
        </p>
      </details>
    </section>
  )
}
