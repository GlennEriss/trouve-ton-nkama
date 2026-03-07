'use client'

import React from 'react'
import { MessageCircle, CheckCircle2, Wallet } from 'lucide-react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditPacksList from './CreditPacksList'
import PremiumServicesInfo from './PremiumServicesInfo'
import MyBalanceNavigation from './MyBalanceNavigation'

const DEFAULT_RECHARGE_WHATSAPP_PHONE = '+221773161707'

function buildWhatsappLink() {
  const contact =
    process.env.NEXT_PUBLIC_CREDIT_RECHARGE_WHATSAPP ??
    DEFAULT_RECHARGE_WHATSAPP_PHONE
  const phone = contact.replace(/[^\d]/g, '')
  const message =
    'Bonjour, je souhaite recharger mon compte crédits sur Trouve Ton Nkama. Merci de me communiquer la procédure.'

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export default function MyBalanceRechargeComponent() {
  const whatsappLink = buildWhatsappLink()

  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8 max-w-[1280px] 2xl:max-w-[1440px]">
      <MyBalanceNavigation
        title="Recharge & packs"
        description="Les recharges sont actuellement traitées manuellement via WhatsApp après dépôt. Choisissez un pack puis contactez le support."
      />

      <CreditBalanceDisplay />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Wallet className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mt-0.5" />
          <div>
            <h2 className="text-lg md:text-xl font-bold text-emerald-900 dark:text-emerald-300">
              Recharge manuelle active
            </h2>
            <p className="text-sm md:text-base text-emerald-800/90 dark:text-emerald-300/90">
              Le paiement API opérateur n&apos;est pas encore activé. La recharge se fait pour le moment via WhatsApp.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">1. Choisir un pack</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Sélectionnez le forfait adapté à votre besoin.</p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">2. Contacter WhatsApp</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Indiquez le pack souhaité et suivez la procédure de dépôt.</p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">3. Créditement manuel</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Après confirmation du dépôt, vos crédits sont ajoutés manuellement.</p>
          </div>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 bg-[#146B67] hover:bg-[#125A56] text-white font-semibold transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contacter le support sur WhatsApp
        </a>

        <div className="flex items-start gap-2 text-xs md:text-sm text-emerald-900/80 dark:text-emerald-300/90">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Historique et solde sont mis à jour après traitement de la recharge.</p>
        </div>
      </div>

      <CreditPacksList />
      <PremiumServicesInfo />
    </div>
  )
}
