'use client'

import React from 'react'
import { Megaphone, TrendingUp, ArrowUpCircle, Bot, Info } from 'lucide-react'

interface PremiumService {
  id: string
  name: string
  description: string
  credits: number
  estimatedPrice: number
  icon: React.ComponentType<{ className?: string }>
  duration?: string
  benefits: string[]
}

const premiumServices: PremiumService[] = [
  {
    id: 'featured',
    name: 'Mise à la une',
    description: 'Votre annonce en première position sur la page d\'accueil',
    credits: 15,
    estimatedPrice: 5250,
    duration: '7 jours',
    icon: Megaphone,
    benefits: ['Visibilité maximale', 'Première position', '+300% de vues en moyenne']
  },
  {
    id: 'trending-7d',
    name: 'Mise en tendance',
    description: 'Annonce prioritaire dans les résultats de recherche',
    credits: 10,
    estimatedPrice: 3500,
    duration: '7 jours',
    icon: TrendingUp,
    benefits: ['Apparition prioritaire', 'Badge "Tendance"', '+150% de contacts']
  },
  {
    id: 'trending-3d',
    name: 'Mise en tendance courte',
    description: 'Version courte de la mise en tendance',
    credits: 5,
    estimatedPrice: 2000,
    duration: '3 jours',
    icon: TrendingUp,
    benefits: ['Boost rapide', 'Idéal pour tester', '+100% de visibilité']
  },
  {
    id: 'boost',
    name: 'Remonter une annonce',
    description: 'Remise en haut de liste instantanée',
    credits: 3,
    estimatedPrice: 1200,
    icon: ArrowUpCircle,
    benefits: ['Action immédiate', 'Fraîcheur retrouvée', 'Parfait pour relancer']
  },
  {
    id: 'ai-assistant',
    name: 'Assistant IA',
    description: 'Génération automatique de description optimisée',
    credits: 1,
    estimatedPrice: 350,
    icon: Bot,
    benefits: ['Description professionnelle', 'Mots-clés optimisés', 'Gain de temps']
  }
]

export default function PremiumServicesInfo() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Info className="w-7 h-7 text-[#146B67] dark:text-[#1FA89B]" />
          <h2 className="text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            Services Premium
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Boostez la performance de vos annonces avec nos services premium. Voici le détail des coûts en crédits.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {premiumServices.map((service) => (
          <div 
            key={service.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-[#146B67]/10 dark:bg-[#1FA89B]/10 rounded-xl flex items-center justify-center">
                  <service.icon className="w-6 h-6 text-[#146B67] dark:text-[#1FA89B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    {service.name}
                  </h3>
                  {service.duration && (
                    <span className="mt-1 inline-block rounded-full bg-[#146B67]/10 px-2 py-1 text-xs font-medium text-[#146B67] dark:bg-[#146B67]/40 dark:text-teal-100">
                      {service.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {service.description}
              </p>

              {/* Cost */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#146B67]/5 to-[#1FA89B]/5 dark:from-[#146B67]/10 dark:to-[#1FA89B]/10 rounded-xl">
                <div>
                  <div className="text-2xl font-bold text-[#146B67] dark:text-[#1FA89B]">
                    {service.credits} crédits
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ≈ {service.estimatedPrice.toLocaleString()} FCFA
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Avantages :
                </div>
                <ul className="space-y-1">
                  {service.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 bg-[#146B67] dark:bg-[#1FA89B] rounded-full flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ROI Information */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
              Optimisez votre retour sur investissement
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Stratégies recommandées :
              </h4>
              <ul className="list-disc space-y-2 pl-4 text-emerald-700 marker:text-emerald-500 dark:text-emerald-400">
                <li>Commencez par un <strong>boost simple (3 crédits)</strong> pour tester</li>
                <li>Utilisez la <strong>mise en tendance 7j</strong> pour les annonces prioritaires</li>
                <li>Réservez la <strong>mise à la une</strong> pour vos meilleures propriétés</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Résultats moyens observés :
              </h4>
              <ul className="list-disc space-y-2 pl-4 text-emerald-700 marker:text-emerald-500 dark:text-emerald-400">
                <li><strong>+300% de vues</strong> avec mise à la une</li>
                <li><strong>+150% de contacts</strong> avec mise en tendance</li>
                <li><strong>70% de chances</strong> de location sous 15 jours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
