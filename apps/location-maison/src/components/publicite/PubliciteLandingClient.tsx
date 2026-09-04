'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Sparkles,
  MessageCircle,
  ChevronDown,
  Search as SearchIcon,
  FileText,
  Home as HomeIcon,
  Video as VideoIcon,
  Check,
} from 'lucide-react'
import { routes } from '@/constantes/routes'
import { trackingEvents, useTrackEvent } from '@/features/analytics/tracking'
import PubliciteVideoSection from './PubliciteVideoSection'
import {
  USE_CASES,
  HOW_IT_WORKS_STEPS,
  BENEFITS,
  FAQ_ITEMS,
  WHERE_IT_APPEARS,
} from './content'
import type { PublicAdPlan } from './pricing'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '24106844305'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Bonjour, j\'ai une question sur la publicité Trouve Ton Nkama.',
)}`

const NAV_LINKS = [
  { href: '#video', label: 'Comment ça marche' },
  { href: '#emplacements', label: 'Emplacements' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#faq', label: 'FAQ' },
] as const

const WHERE_ICONS = {
  search: SearchIcon,
  listing: FileText,
  home: HomeIcon,
  reels: VideoIcon,
} as const

// Props d'animation "révélation au scroll" pour une <motion.section> — objets littéraux
// directement sur initial/whileInView (pas de variants nommées) pour éviter toute ambiguïté
// entre plusieurs sections qui partagent le même hook. `prefers-reduced-motion` : tout est
// `undefined`, la section s'affiche telle quelle sans aucune transition.
function useRevealAnimation(delay = 0) {
  const shouldReduceMotion = useReducedMotion()
  if (shouldReduceMotion) {
    return {}
  }
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.5, delay },
  }
}

// Même principe pour le hero, mais joué immédiatement au montage (initial/animate) plutôt
// qu'au scroll, puisqu'il est visible dès le chargement de la page.
function useEntranceAnimation(delay = 0) {
  const shouldReduceMotion = useReducedMotion()
  if (shouldReduceMotion) {
    return {}
  }
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  }
}

export default function PubliciteLandingClient({
  plans,
  entryPriceLabel,
}: {
  plans: PublicAdPlan[]
  entryPriceLabel: string
}) {
  const { trackEvent } = useTrackEvent()
  const revealAnim = useRevealAnimation()
  const heroTextAnim = useEntranceAnimation()
  const heroVisualAnim = useEntranceAnimation(0.15)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [isPastHero, setIsPastHero] = useState(false)
  const [isVideoPlayerVisible, setIsVideoPlayerVisible] = useState(false)
  const [hasTrackedPricing, setHasTrackedPricing] = useState(false)

  // Le bouton d'action mobile fixe n'apparaît qu'une fois le hero (et son propre CTA) hors champ.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const hero = document.getElementById('hero-cta')
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsPastHero(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px' },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  // ... et disparaît le temps que le lecteur vidéo (PubliciteVideoSection, #video-player) est à
  // l'écran, pour ne jamais recouvrir ses contrôles (natifs une fois la lecture démarrée, ou le
  // simple bouton lecture avant) — bug mobile signalé par l'utilisateur. threshold à 0 : la barre
  // se retire dès qu'un seul pixel du lecteur entre dans le viewport, pas seulement quand il est
  // pleinement visible.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const videoPlayer = document.getElementById('video-player')
    if (!videoPlayer) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVideoPlayerVisible(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(videoPlayer)
    return () => observer.disconnect()
  }, [])

  const showStickyCta = isPastHero && !isVideoPlayerVisible

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || hasTrackedPricing) return
    const pricing = document.getElementById('tarifs')
    if (!pricing) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasTrackedPricing(true)
          trackEvent(trackingEvents.PUBLICITE_PRICING_VIEWED)
          observer.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(pricing)
    return () => observer.disconnect()
  }, [hasTrackedPricing, trackEvent])

  const handleCtaClick = (position: string) => {
    trackEvent(trackingEvents.PUBLICITE_CTA_CLICKED, { position })
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Navigation d'ancres propre à la page — la navbar globale (logo, Se connecter,
          inscription) est déjà rendue par le layout public au-dessus ; pas de doublon ici, juste
          les raccourcis vers les sections de CETTE page (demande explicite §3.1 de
          LANDING-PUBLICITE.md). Non "sticky" : la navbar globale l'est déjà sur desktop
          (Navbar.tsx, md:sticky), en superposer une seconde créerait un empilement confus. */}
      <nav className="hidden justify-center gap-6 border-b border-gray-100 bg-gray-50/60 py-3 text-sm font-medium text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300 md:flex">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-secondary">
            {link.label}
          </a>
        ))}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-2">
          <motion.div {...heroTextAnim} className="space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-sm font-semibold text-secondary">
              <Sparkles className="h-4 w-4" />
              La publicité locale, simple et abordable
            </span>

            <h1 className="text-3xl font-extrabold leading-tight text-ink dark:text-white sm:text-4xl lg:text-5xl">
              Faites connaître votre activité au public gabonais
            </h1>

            <p className="mx-auto max-w-xl text-base text-gray-600 dark:text-gray-300 lg:mx-0">
              Diffusez votre publicité sur Trouve Ton Nkama avec une image ou une vidéo, dirigez
              les clients vers votre WhatsApp ou votre site et suivez vos résultats.
            </p>

            <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-sm font-bold text-ink dark:text-white">
              À partir de {entryPriceLabel} pour 7 jours
            </p>

            <div id="hero-cta" className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href={routes.protected.advertising_create}
                onClick={() => handleCtaClick('hero')}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-600 sm:w-auto"
              >
                Créer ma publicité
              </Link>
              <a
                href="#video"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-secondary px-7 py-3 font-semibold text-secondary transition hover:bg-secondary/5 sm:w-auto"
              >
                Voir la vidéo
              </a>
            </div>
          </motion.div>

          <motion.div {...heroVisualAnim} className="relative mx-auto w-full max-w-sm">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="/images/publicite/entrepreneure-boutique.jpg"
                alt="Entrepreneure gabonaise gérant sa boutique et consultant sa publicité sur Trouve Ton Nkama"
                fill
                priority
                sizes="(max-width: 640px) 90vw, 384px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-4 w-40 rounded-2xl border border-gray-100 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:w-48">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                Sponsorisé
              </p>
              <p className="mt-1 text-xs font-bold text-ink dark:text-white">
                Découvrez nos services au Gabon
              </p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">1 248 vues · 87 clics</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Est-ce fait pour moi */}
      <motion.section {...revealAnim} className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-center text-2xl font-bold text-ink dark:text-white">
          Pas besoin d&apos;être dans l&apos;immobilier
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-300">
          Trouve Ton Nkama Publicité s&apos;adresse à toute activité qui veut être vue au Gabon.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {USE_CASES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-ink dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <Icon className="h-4 w-4 text-secondary" />
              {label}
            </span>
          ))}
        </div>
      </motion.section>

      {/* Vidéo */}
      <PubliciteVideoSection />

      {/* Où la publicité apparaît */}
      <motion.section id="emplacements" {...revealAnim} className="bg-gray-50 py-16 dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-2xl font-bold text-ink dark:text-white sm:text-3xl">
            Où votre publicité apparaît
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-300">
            Toujours signalée par le label « Sponsorisé », sur mobile comme sur ordinateur.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHERE_IT_APPEARS.map(({ icon, title, text }) => {
              const Icon = WHERE_ICONS[icon]
              return (
                <div
                  key={title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink dark:text-white">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Comment ça marche */}
      <motion.section {...revealAnim} className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Comment ça marche
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-300">
          Quatre étapes, sans enchère, sans pixel, sans ciblage compliqué.
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-[180px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700">
                {'image' in step ? (
                  <div className="relative aspect-[9/16]">
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[9/16] items-center justify-center bg-secondary/10">
                    <step.icon className="h-10 w-10 text-secondary" />
                  </div>
                )}
              </div>
              <span className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                {step.number}
              </span>
              <h3 className="mt-2 font-semibold text-ink dark:text-white">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.text}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Tarifs */}
      <motion.section id="tarifs" {...revealAnim} className="bg-gray-50 py-16 dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center text-2xl font-bold text-ink dark:text-white sm:text-3xl">
            Des forfaits accessibles
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-gray-600 dark:text-gray-300">
            Prix en FCFA, durée et emplacements toujours visibles.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={
                  'flex flex-col rounded-2xl border bg-white p-6 dark:bg-gray-900 ' +
                  (plan.highlight
                    ? 'border-secondary ring-2 ring-secondary/30'
                    : 'border-gray-200 dark:border-gray-700')
                }
              >
                {plan.highlight && (
                  <span className="mb-3 inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white">
                    Le plus choisi
                  </span>
                )}
                <h3 className="font-bold text-ink dark:text-white">{plan.name}</h3>
                <p className="mt-2 text-2xl font-extrabold text-secondary">{plan.priceLabel}</p>
                <p className="mt-1 text-sm text-gray-500">{plan.durationDays} jours</p>
                <p className="mt-1 text-sm text-gray-500">{plan.placementsLabel}</p>
                <p className="mt-3 flex-1 text-sm text-gray-600 dark:text-gray-300">{plan.description}</p>
                <Link
                  href={routes.protected.advertising_create}
                  onClick={() => handleCtaClick(`pricing_${plan.id}`)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-secondary px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/5"
                >
                  Choisir ce forfait
                </Link>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-gray-400">
            Tarifs indicatifs en FCFA, calculés au meilleur taux crédit disponible. Le montant
            exact est confirmé avant paiement, dans l&apos;espace connecté.
          </p>
        </div>
      </motion.section>

      {/* Bénéfices */}
      <motion.section {...revealAnim} className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Pourquoi annoncer sur Trouve Ton Nkama
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
            >
              <Icon className="h-7 w-7 text-secondary" />
              <h3 className="mt-3 font-semibold text-ink dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* FAQ */}
      <motion.section id="faq" {...revealAnim} className="bg-gray-50 py-16 dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-2xl font-bold text-ink dark:text-white sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={item.question}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="flex w-full min-h-11 items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink dark:text-white"
                  >
                    {item.question}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      {item.answer}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* CTA final */}
      <motion.section {...revealAnim} className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
        <div className="rounded-3xl bg-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Prêt à faire connaître votre activité ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Créez votre campagne à partir de {entryPriceLabel} et présentez votre offre au public
            gabonais.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={routes.protected.advertising_create}
              onClick={() => handleCtaClick('final_cta')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-secondary px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-primary-600"
            >
              <Check className="h-5 w-5" />
              Créer ma publicité
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-5 w-5" />
              Une question ? WhatsApp
            </a>
          </div>
        </div>
      </motion.section>

      {/* CTA mobile fixe — posée AU-DESSUS de la barre de navigation mobile permanente de
          l'app (BottomNavigation.tsx, fixed bottom-0 z-50, ~6rem + safe-area) plutôt qu'à
          bottom-0 : sinon elle serait recouverte (z-40 < z-50) et donc invisible/inutile.
          Masquée tant que le lecteur vidéo est à l'écran (isVideoPlayerVisible) — sinon elle
          recouvre ses contrôles, voir la section vidéo plus haut. */}
      {showStickyCta && (
        <div
          className="fixed inset-x-0 z-40 border-t border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <Link
            href={routes.protected.advertising_create}
            onClick={() => handleCtaClick('sticky_mobile')}
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-secondary px-6 py-3 font-semibold text-white shadow-lg"
          >
            Créer ma publicité — {entryPriceLabel}
          </Link>
        </div>
      )}
    </div>
  )
}
