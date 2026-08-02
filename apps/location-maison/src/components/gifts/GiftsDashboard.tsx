'use client'

/**
 * Espace « Mes cadeaux » de l'annonceur : solde disponible / total reçu /
 * total retiré, demande de retrait (intégralité du disponible, frais 5 %,
 * minimum requis), historique des cadeaux reçus (montants nets) et des
 * retraits. Composition calquée sur my-balance (solde + historiques).
 */

import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDownToLine, CheckCircle2, Clock, Gift, Loader2, Smartphone, XCircle } from 'lucide-react'
import {
  WITHDRAWAL_MINIMUM_XAF,
  computeWithdrawalFee,
  computeWithdrawalNetPayout,
} from '@/constantes/gifts'
import { PAYMENT_METHODS, isPhoneValidForNetwork } from '@/constantes/payment-methods'
import { useGiftsSummary } from '@/hooks/use-gifts-summary'
import { useToast } from '@/hooks/use-toast'

function formatXaf(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const WITHDRAWAL_STATUS_UI = {
  EN_ATTENTE: { label: 'En attente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: Clock },
  TRAITE: { label: 'Versé', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: CheckCircle2 },
  REFUSE: { label: 'Refusé', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: XCircle },
} as const

export default function GiftsDashboard() {
  const summaryQuery = useGiftsSummary()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showWithdrawForm, setShowWithdrawForm] = React.useState(false)
  const [numero, setNumero] = React.useState('')
  const [reseau, setReseau] = React.useState<'AM' | 'MM'>('AM')
  const [submitting, setSubmitting] = React.useState(false)

  if (summaryQuery.isPending || summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-slate-500">Impossible de charger tes cadeaux. Réessaie plus tard.</p>
      </div>
    )
  }

  const { balance, gifts, withdrawals } = summaryQuery.data
  const canWithdraw = balance.disponibleXaf >= WITHDRAWAL_MINIMUM_XAF && !balance.hasPendingWithdrawal
  const missingXaf = Math.max(0, WITHDRAWAL_MINIMUM_XAF - balance.disponibleXaf)
  const phoneValid = isPhoneValidForNetwork(numero, reseau)

  const handleWithdraw = async () => {
    if (!phoneValid || submitting) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/gifts/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, reseau }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message ?? 'La demande de retrait a échoué.')
      }
      toast({ title: 'Demande envoyée', description: 'Traitement sous 48h. Notre équipe te contacte si besoin.' })
      setShowWithdrawForm(false)
      setNumero('')
      await queryClient.invalidateQueries({ queryKey: ['gifts-summary'] })
    } catch (error) {
      toast({
        title: 'Retrait impossible',
        description: error instanceof Error ? error.message : 'Erreur inattendue.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-2 md:px-0 md:pb-8">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900 md:p-6">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary dark:text-primary-200">
          <Gift className="h-3.5 w-3.5" />
          Espace annonceur
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">Mes cadeaux</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Les soutiens reçus sur tes réels, à retirer sur ton compte Mobile Money.
        </p>
      </section>

      {/* Cartes de solde */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-sm dark:border-secondary/30 dark:bg-secondary/10">
          <p className="text-xs font-medium uppercase tracking-wide text-primary dark:text-primary-200">Disponible au retrait</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatXaf(balance.disponibleXaf)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total reçu</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatXaf(balance.totalRecuXaf)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total retiré</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{formatXaf(balance.totalRetireXaf)}</p>
        </div>
      </div>

      {/* Retrait */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-900">
        {balance.hasPendingWithdrawal && (
          <p className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Une demande de retrait est en cours de traitement (sous 48h).
          </p>
        )}

        {!balance.hasPendingWithdrawal && !canWithdraw && (
          <p className="text-sm text-slate-500">
            Retrait possible à partir de {formatXaf(WITHDRAWAL_MINIMUM_XAF)} — il te manque encore{' '}
            <span className="font-medium text-slate-900 dark:text-white">{formatXaf(missingXaf)}</span>.
          </p>
        )}

        {canWithdraw && !showWithdrawForm && (
          <button
            type="button"
            onClick={() => setShowWithdrawForm(true)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Retirer {formatXaf(balance.disponibleXaf)}
          </button>
        )}

        {canWithdraw && showWithdrawForm && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Ton numéro Mobile Money pour recevoir le versement
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.network}
                  type="button"
                  onClick={() => setReseau(method.network)}
                  aria-pressed={reseau === method.network}
                  className={`min-h-11 rounded-full border px-3 text-sm font-medium transition ${
                    reseau === method.network
                      ? 'border-primary bg-primary/5 text-primary dark:border-secondary dark:bg-secondary/10 dark:text-primary-200'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {method.name}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="gift-withdrawal-phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Numéro Mobile Money
              </label>
              <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="gift-withdrawal-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="074 XX XX XX"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                aria-invalid={Boolean(numero && !phoneValid)}
                aria-describedby={numero && !phoneValid ? 'gift-withdrawal-phone-error' : undefined}
                className="h-12 w-full rounded-full border border-slate-200 py-2 pl-10 pr-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              </div>
            </div>
            {numero && !phoneValid && (
              <p id="gift-withdrawal-phone-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                Numéro invalide pour ce réseau (Airtel : 074/077 — Moov : 062/065/066).
              </p>
            )}
            <p className="text-sm text-slate-500">
              Frais de service : {formatXaf(computeWithdrawalFee(balance.disponibleXaf))} → tu recevras{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatXaf(computeWithdrawalNetPayout(balance.disponibleXaf))}
              </span>
              . Traitement sous 48h.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!phoneValid || submitting}
                onClick={() => void handleWithdraw()}
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmer le retrait
              </button>
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="min-h-11 rounded-full border border-slate-200 px-5 text-sm font-medium dark:border-slate-700"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique des retraits */}
      {withdrawals.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary dark:text-primary-200">
            Historique des retraits
          </h2>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-gray-900">
            {withdrawals.map((withdrawal) => {
              const status = WITHDRAWAL_STATUS_UI[withdrawal.statut]
              const StatusIcon = status.icon
              return (
                <div key={withdrawal.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{formatXaf(withdrawal.netPayoutXaf)}</p>
                    <p className="text-xs text-slate-500">
                      {withdrawal.reseau === 'AM' ? 'Airtel Money' : 'Moov Money'} · {withdrawal.numero} ·{' '}
                      {formatDate(withdrawal.dateCreation)}
                    </p>
                    {withdrawal.statut === 'REFUSE' && withdrawal.motifRefus && (
                      <p className="mt-1 text-xs text-red-500">Motif : {withdrawal.motifRefus}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historique des cadeaux reçus */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary dark:text-primary-200">Cadeaux reçus</h2>
        {gifts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
            <Gift className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              Aucun cadeau pour le moment. Publie des réels pour recevoir des soutiens !
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-gray-900">
            {gifts.map((gift) => (
              <div key={gift.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">+{formatXaf(gift.netAmountXaf)}</p>
                  <p className="text-xs text-slate-500">
                    {gift.donorPhoneMasked} · {formatDate(gift.createdAt)}
                  </p>
                  {gift.message && (
                    <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-400">« {gift.message} »</p>
                  )}
                </div>
                <Gift className="h-5 w-5 shrink-0 text-primary dark:text-primary-200" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
