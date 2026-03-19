'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, X, Send } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import { useWindowSize } from '@/hooks/useSize'
import { useCurrentUser } from '@/hooks/use-current-user'

const logger = createLogger('components.ai-assistant-modal')

interface AssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (description: string, images?: File[]) => Promise<void>
  requiredFields: string[]
  isLoading?: boolean
  creditsAvailable?: number
  canGenerate?: boolean
}

export default function AssistantModal({
  isOpen,
  onClose,
  onGenerate,
  requiredFields: _requiredFields,
  isLoading = false,
  creditsAvailable: _creditsAvailable = 0,
  canGenerate = true
}: AssistantModalProps) {
  const [description, setDescription] = useState('')
  const { width } = useWindowSize()
  const { user } = useCurrentUser()

  const isMobileViewport = width === 0 || width < 768
  const hasBottomNavigation = Boolean(user && isMobileViewport)
  const mobileBottomOffset = hasBottomNavigation ? 176 : 104

  const handleGenerate = async () => {
    if (!description.trim() || !canGenerate || isLoading) return

    try {
      await onGenerate(description.trim())
      setDescription('')
      onClose()
    } catch (error) {
      logger.error('Erreur lors de la génération', { error })
    }
  }

  const handleClose = () => {
    setDescription('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed right-4 z-[60] w-[min(90vw,360px)] md:right-6"
          style={
            isMobileViewport
              ? { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomOffset}px)` }
              : { bottom: '110px' }
          }
          role="dialog"
          aria-modal="false"
          aria-label="Assistant IA"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, mass: 0.7 }}
        >
          <motion.div
            className="relative rounded-xl border border-gray-100 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-900"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#e9fffa] ring-1 ring-[#bdeedd]">
                <Wand2 className="h-3.5 w-3.5 text-[#156B68]" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Assistant IA</p>
              <button
                type="button"
                onClick={handleClose}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <motion.div
              className="mt-3 space-y-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                👋 Salut ! Je vais créer votre annonce en quelques secondes.
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre logement..."
                  className="h-24 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#156B68] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  autoFocus
                  disabled={isLoading}
                />

                <div className="mt-2 flex justify-end">
                  <motion.button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!description.trim() || !canGenerate || isLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#156B68] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#125b59] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {isLoading ? 'Génération...' : 'Envoyer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 border-b border-r border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
