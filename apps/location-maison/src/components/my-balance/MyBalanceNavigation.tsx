'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coins, History, WalletCards } from 'lucide-react'
import { routes } from '@/constantes/routes'

const tabs = [
  {
    href: routes.protected.my_balance_history,
    label: 'Historique',
    icon: History,
  },
  {
    href: routes.protected.my_balance_recharge,
    label: 'Recharge & packs',
    icon: WalletCards,
  },
]

interface MyBalanceNavigationProps {
  title: string
  description: string
}

export default function MyBalanceNavigation({
  title,
  description,
}: Readonly<MyBalanceNavigationProps>) {
  const pathname = usePathname()

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <Coins className="w-6 h-6 md:w-8 md:h-8 text-[#146B67] dark:text-[#1FA89B]" />
          <h1 className="text-2xl md:text-3xl font-bold text-[#146B67] dark:text-[#1FA89B]">
            {title}
          </h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-2">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 rounded-xl px-3 md:px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#146B67] text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
