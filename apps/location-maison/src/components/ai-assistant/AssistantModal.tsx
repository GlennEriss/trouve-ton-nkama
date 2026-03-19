'use client'

import React, { useRef, useState } from 'react'
import { Wand2, X, Send, ImagePlus } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import imageCompression from 'browser-image-compression'
import { MAX_IMAGES_UPLOAD } from '@/constantes'
import { useWindowSize } from '@/hooks/useSize'
import { useCurrentUser } from '@/hooks/use-current-user'

const logger = createLogger('components.ai-assistant-modal')
const IMAGE_MAX_SIZE_BYTES = 300 * 1024
const QUICK_PROMPTS = [
  'Studio meublé à Owendo proche pédiatrie',
  'Appartement 3 pièces avec balcon',
  'Maison familiale avec cour et garage'
]

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
  requiredFields,
  isLoading = false,
  creditsAvailable = 0,
  canGenerate = true
}: AssistantModalProps) {
  const [description, setDescription] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const { width } = useWindowSize()
  const { user } = useCurrentUser()

  const isMobileViewport = width === 0 || width < 768
  const hasBottomNavigation = Boolean(user && isMobileViewport)
  const mobileBottomOffset = hasBottomNavigation ? 176 : 104

  const handleGenerate = async () => {
    if (!description.trim() || !canGenerate || isProcessingImages) return

    try {
      await onGenerate(description.trim(), selectedImages)
      setDescription('')
      setSelectedImages([])
      onClose()
    } catch (error) {
      // L'erreur est gérée dans le hook
      logger.error('Erreur lors de la génération', { error })
    }
  }

  const handleClose = () => {
    setDescription('')
    setSelectedImages([])
    onClose()
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages((current) => current.filter((_, imageIndex) => imageIndex !== index))
  }

  const handleAddImagesClick = () => {
    imageInputRef.current?.click()
  }

  const handleImagesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const remainingSlots = Math.max(MAX_IMAGES_UPLOAD - selectedImages.length, 0)
    if (remainingSlots === 0) return

    setIsProcessingImages(true)

    try {
      const compressedFiles: File[] = []

      for (const file of files.slice(0, remainingSlots)) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1920,
        })
        if (compressed.size <= IMAGE_MAX_SIZE_BYTES) {
          compressedFiles.push(compressed)
        }
      }

      if (compressedFiles.length > 0) {
        setSelectedImages((current) => [...current, ...compressedFiles].slice(0, MAX_IMAGES_UPLOAD))
      }
    } catch (error) {
      logger.error("Impossible de préparer les images pour l'assistant IA", { error })
    } finally {
      setIsProcessingImages(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed right-4 z-[60] w-[min(90vw,360px)] md:right-6"
      style={
        isMobileViewport
          ? { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomOffset}px)` }
          : { bottom: '110px' }
      }
      role="dialog"
      aria-modal="false"
      aria-label="Assistant IA"
    >
      <div className="relative animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="relative rounded-xl border border-gray-100 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-900">
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

          <div className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              👋 Salut ! Je vais créer votre annonce en quelques secondes.
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre logement..."
                className="h-24 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-[#156B68] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                autoFocus
                disabled={isLoading}
              />

              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDescription(prompt)}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    disabled={isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImagesSelected}
              disabled={isLoading || isProcessingImages}
            />

            {selectedImages.length > 0 && (
              <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                {selectedImages.map((image, index) => (
                  <div
                    key={`${image.name}-${image.size}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-gray-900"
                  >
                    <span className="truncate pr-3 text-xs text-gray-700 dark:text-gray-200">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                      disabled={isLoading}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleAddImagesClick}
                disabled={isLoading || isProcessingImages || selectedImages.length >= MAX_IMAGES_UPLOAD}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <ImagePlus className="h-4 w-4" />
                {isProcessingImages ? 'Traitement...' : `Images (${selectedImages.length}/${MAX_IMAGES_UPLOAD})`}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!description.trim() || !canGenerate || isLoading || isProcessingImages}
                className="inline-flex items-center gap-2 rounded-full bg-[#156B68] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#125b59] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Génération...' : 'Envoyer'}
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
              {requiredFields.length} champ{requiredFields.length > 1 ? 's' : ''} requis pris en charge. {creditsAvailable}{' '}
              crédit{creditsAvailable > 1 ? 's' : ''} restant{creditsAvailable > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 border-b border-r border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-900" />
        </div>
      </div>
    </div>
  )
}
