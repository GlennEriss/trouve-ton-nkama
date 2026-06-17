import type { Metadata } from 'next'
import React from 'react'
import Link from 'next/link'
import { routes } from '@/constantes/routes'
import { MapPin, Eye, Megaphone, BadgeCheck, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Faire de la pub - Trouve Ton Nkama',
  description:
    "Faites la promotion de votre entreprise, marque ou service auprès d'une audience ciblée au Gabon. Forfaits simples et abordables sur Trouve Ton Nkama.",
}

// Numéro de contact configurable via env, sinon le numéro officiel (+241 06 84 43 05).
const WHATSAPP =
  process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || '24106844305'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  'Bonjour, je souhaite faire de la publicité sur Trouve Ton Nkama.',
)}`

const BENEFITS = [
  {
    icon: Eye,
    title: 'Audience ciblée',
    text: "Touchez des visiteurs activement à la recherche de logements et de services au Gabon.",
  },
  {
    icon: MapPin,
    title: 'Ciblage local',
    text: 'Diffusez votre pub par province et par ville, au plus près de vos clients.',
  },
  {
    icon: BadgeCheck,
    title: 'Simple et rapide',
    text: 'Envoyez votre visuel, on s’occupe de tout. Votre pub est en ligne en 24h.',
  },
]

const PLACEMENTS = [
  'Page de recherche (entre les annonces)',
  "Page détail d'une annonce",
  "Page d'accueil",
  'Pages immobilier (par ville)',
]

const PLANS = [
  { name: 'Découverte', duration: '7 jours', placements: '1 emplacement', price: '≈ 5 000 FCFA' },
  { name: 'Visibilité', duration: '14 jours', placements: "jusqu'à 2 emplacements", price: '≈ 12 000 FCFA', highlight: true },
  { name: 'Marque', duration: '30 jours', placements: 'tous les emplacements', price: '≈ 25 000 FCFA' },
]

export default function AdvertisePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#1FA89B]/30 bg-[#1FA89B]/10 px-4 py-2">
          <Megaphone className="w-5 h-5 text-[#1FA89B]" />
          <span className="font-semibold text-[#224D62]">Publicité</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#224D62] dark:text-white">
          Faites connaître votre business au Gabon
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600 dark:text-gray-300">
          Restaurant, boutique, garage, école, événement… Mettez votre publicité
          devant une audience locale et ciblée, à un tarif abordable.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={routes.protected.advertising}
            className="inline-flex items-center gap-2 rounded-full bg-[#1FA89B] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#188a7f]"
          >
            <Megaphone className="w-5 h-5" />
            Créer ma pub en ligne
          </Link>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#1FA89B] px-6 py-3 font-semibold text-[#1FA89B] transition hover:bg-[#1FA89B]/5"
          >
            <MessageCircle className="w-5 h-5" />
            Ou nous écrire sur WhatsApp
          </a>
        </div>
      </section>

      {/* Bénéfices */}
      <section className="grid gap-5 md:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6 dark:bg-gray-900 dark:border-gray-700">
            <Icon className="w-8 h-8 text-[#1FA89B]" />
            <h3 className="mt-3 font-semibold text-[#224D62] dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
          </div>
        ))}
      </section>

      {/* Emplacements */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#224D62] dark:text-white">Où s’affiche votre pub ?</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PLACEMENTS.map((p) => (
            <li key={p} className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <BadgeCheck className="w-5 h-5 text-[#1FA89B] shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Tarifs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-[#224D62] dark:text-white">Nos forfaits</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                'rounded-2xl border p-6 ' +
                (plan.highlight
                  ? 'border-[#1FA89B] ring-2 ring-[#1FA89B]/30 bg-white dark:bg-gray-900'
                  : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700')
              }
            >
              <h3 className="font-bold text-[#224D62] dark:text-white">{plan.name}</h3>
              <p className="mt-2 text-2xl font-extrabold text-[#1FA89B]">{plan.price}</p>
              <p className="mt-1 text-sm text-gray-500">{plan.duration}</p>
              <p className="text-sm text-gray-500">{plan.placements}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Tarifs indicatifs en FCFA. Paiement direct (Airtel Money, espèces, virement). Le détail est confirmé au moment de la commande.
        </p>
      </section>

      {/* CTA final */}
      <section className="rounded-2xl bg-[#224D62] px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-bold">Prêt à booster votre visibilité ?</h2>
        <p className="mx-auto mt-2 max-w-xl text-white/80">
          Envoyez-nous votre visuel et votre message, on met votre pub en ligne rapidement.
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1FA89B] px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-[#188a7f]"
        >
          <MessageCircle className="w-5 h-5" />
          Nous contacter sur WhatsApp
        </a>
      </section>
    </div>
  )
}
