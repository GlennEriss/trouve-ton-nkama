import React from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Wallet, RotateCcw } from 'lucide-react'
import { routes } from '@/constantes/routes'

interface PaiementPageProps {
  searchParams: Promise<{ payment?: string }>
}

export default async function PaiementRetourPage({ searchParams }: Readonly<PaiementPageProps>) {
  const { payment } = await searchParams
  const isSuccess = payment === 'success'

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-xl">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 md:p-10 text-center space-y-6 shadow-sm">
        {isSuccess ? (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Paiement reçu
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Merci ! Votre paiement a bien été pris en compte. Vos crédits sont ajoutés à votre
                solde après confirmation par l&apos;opérateur (généralement en quelques instants).
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-9 h-9 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Paiement non abouti
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Votre paiement n&apos;a pas pu être finalisé. Aucun crédit n&apos;a été débité.
                Vous pouvez réessayer depuis votre solde.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={routes.protected.my_balance}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-[#146B67] hover:bg-[#125A56] text-white font-semibold transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Voir mon solde
          </Link>
          {!isSuccess && (
            <Link
              href={routes.protected.my_balance_recharge}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 border border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réessayer
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
