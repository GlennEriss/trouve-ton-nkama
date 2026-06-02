'use client'

/**
 * Provider global de recharge de crédits.
 *
 * Monte une seule instance de PurchaseModal (flux MyPayGa) au niveau de
 * l'application et expose `useRecharge().openRecharge()` pour déclencher la
 * recharge depuis n'importe quelle surface (solde, promotions, assistant IA…).
 *
 * La modale n'est montée que lorsqu'elle est ouverte, pour éviter de déclencher
 * les requêtes de packs en arrière-plan sur toutes les pages.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import PurchaseModal from '@/components/my-balance/PurchaseModal'
import type { CreditPackUi } from '@/lib/credits/credit-packs'

interface RechargeContextValue {
  openRecharge: (preselectedPack?: CreditPackUi | null) => void
  closeRecharge: () => void
  isRechargeOpen: boolean
}

const RechargeContext = createContext<RechargeContextValue | null>(null)

export function RechargeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPack, setSelectedPack] = useState<CreditPackUi | null>(null)

  const openRecharge = useCallback((preselectedPack?: CreditPackUi | null) => {
    setSelectedPack(preselectedPack ?? null)
    setIsOpen(true)
  }, [])

  const closeRecharge = useCallback(() => {
    setIsOpen(false)
    setSelectedPack(null)
  }, [])

  const value = useMemo<RechargeContextValue>(
    () => ({ openRecharge, closeRecharge, isRechargeOpen: isOpen }),
    [openRecharge, closeRecharge, isOpen]
  )

  return (
    <RechargeContext.Provider value={value}>
      {children}
      {isOpen && (
        <PurchaseModal
          isOpen={isOpen}
          onClose={closeRecharge}
          preselectedPack={selectedPack}
        />
      )}
    </RechargeContext.Provider>
  )
}

export function useRecharge(): RechargeContextValue {
  const context = useContext(RechargeContext)
  if (!context) {
    throw new Error('useRecharge doit être utilisé à l\'intérieur de <RechargeProvider>')
  }
  return context
}
