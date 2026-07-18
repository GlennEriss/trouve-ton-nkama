'use client'

import React from 'react'
import { Smartphone, CheckCircle2, Zap } from 'lucide-react'
import CreditBalanceDisplay from './CreditBalanceDisplay'
import CreditPacksList from './CreditPacksList'
import PremiumServicesInfo from './PremiumServicesInfo'
import MyBalanceNavigation from './MyBalanceNavigation'

export default function MyBalanceRechargeComponent() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6 md:space-y-8 max-w-[1280px] 2xl:max-w-[1440px]">
      <MyBalanceNavigation
        title="Recharge & packs"
        description="Rechargez votre solde instantanément par mobile money. Choisissez un pack et confirmez le paiement sur votre téléphone."
      />

      <CreditBalanceDisplay />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Smartphone className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mt-0.5" />
          <div>
            <h2 className="text-lg md:text-xl font-bold text-emerald-900 dark:text-emerald-300">
              Recharge mobile money instantanée
            </h2>
            <p className="text-sm md:text-base text-emerald-800/90 dark:text-emerald-300/90">
              Paiement mobile money sécurisé (Airtel Money / Moov Money). Vos crédits sont ajoutés automatiquement après confirmation.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">1. Choisir un pack</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Sélectionnez le forfait adapté à votre besoin.</p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">2. Saisir son numéro</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Indiquez le réseau et le numéro mobile money à débiter.</p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900 p-3 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300">3. Confirmer sur le téléphone</p>
            <p className="text-emerald-800/80 dark:text-emerald-300/80">Validez la transaction reçue ; vos crédits sont ajoutés aussitôt.</p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs md:text-sm text-emerald-900/80 dark:text-emerald-300/90">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Historique et solde sont mis à jour automatiquement après confirmation du paiement.</p>
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm text-emerald-900 dark:text-emerald-200">
          <Zap className="w-4 h-4 flex-shrink-0" />
          <p>Astuce : cliquez sur un pack ci-dessous pour démarrer la recharge.</p>
        </div>
      </div>

      <CreditPacksList />
      <PremiumServicesInfo />
    </div>
  )
}
