'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

export type PaymentModalStatus = 'pending' | 'success' | 'failed'

interface PaymentStatusModalProps {
  isOpen: boolean
  status: PaymentModalStatus
  /** Numéro affiché dans le message d'attente */
  phoneNumber?: string
  /** Message personnalisé (sinon message par défaut selon le statut) */
  message?: string
  /** Bouton principal (succès / échec) */
  actionLabel?: string
  onAction?: () => void
  /** Fermeture discrète pendant l'attente */
  onClose?: () => void
}

export default function PaymentStatusModal({
  isOpen,
  status,
  phoneNumber,
  message,
  actionLabel,
  onAction,
  onClose,
}: Readonly<PaymentStatusModalProps>) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center"
            initial={{ scale: 0.85, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            {/* En attente de confirmation */}
            {status === 'pending' && (
              <>
                <motion.div
                  className="mx-auto mb-5 flex items-center justify-center"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Clock className="w-20 h-20 text-yellow-500" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                  Confirmez le paiement
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {message ?? (
                    <>
                      Une demande de paiement a été envoyée
                      {phoneNumber ? <> au <span className="font-semibold">{phoneNumber}</span></> : ' sur votre téléphone'}.
                      Validez-la avec votre code mobile money pour finaliser.
                    </>
                  )}
                </p>
                <div className="flex items-center justify-center gap-2 text-primary mb-6">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">En attente de confirmation…</span>
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Fermer
                  </button>
                )}
              </>
            )}

            {/* Succès */}
            {status === 'success' && (
              <>
                <motion.div
                  className="mx-auto mb-5 flex items-center justify-center"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
                >
                  <CheckCircle className="w-20 h-20 text-green-500" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2 text-green-600 dark:text-green-400">
                  Paiement confirmé !
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {message ?? 'Vos crédits ont été ajoutés à votre solde.'}
                </p>
                <button
                  onClick={onAction}
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-800 transition-colors"
                >
                  {actionLabel ?? 'Terminer'}
                </button>
              </>
            )}

            {/* Échec */}
            {status === 'failed' && (
              <>
                <motion.div
                  className="mx-auto mb-5 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.15, 1] }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <XCircle className="w-20 h-20 text-red-500" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">
                  Paiement échoué
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {message ?? "Le paiement n'a pas abouti. Aucun crédit n'a été débité."}
                </p>
                <button
                  onClick={onAction}
                  className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-800 transition-colors"
                >
                  {actionLabel ?? 'Réessayer'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
