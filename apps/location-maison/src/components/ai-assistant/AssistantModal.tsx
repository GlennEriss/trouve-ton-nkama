'use client'

import React, { useRef, useState } from 'react'
import { Wand2, X, Send, ImagePlus, Sparkles } from 'lucide-react'
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
  const mobileBottomOffset = hasBottomNavigation ? 92 : 20

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
      className="fixed inset-x-3 z-[60] md:inset-x-auto md:right-4"
      style={
        isMobileViewport
          ? { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomOffset}px)` }
          : { bottom: '88px' }
      }
      role="dialog"
      aria-modal="false"
      aria-label="Assistant IA"
    >
      <div className="relative ml-auto w-full max-w-[368px] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
        <div className="relative rounded-3xl border border-gray-200 bg-white p-3 shadow-[0_26px_48px_-28px_rgba(15,23,42,0.7)] dark:border-gray-700 dark:bg-gray-900">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-10 rounded-b-2xl bg-gradient-to-b from-[#1de9b6]/15 to-transparent" />

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex items-center gap-2 pl-1 pr-10">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#e9fffa] ring-1 ring-[#bdeedd]">
              <Wand2 className="h-4 w-4 text-[#156B68]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Assistant IA</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-300">En ligne</p>
            </div>

            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#ecfffa] px-2 py-0.5 text-[10px] font-semibold text-[#0f5f5c] ring-1 ring-[#c6f3e7] dark:bg-gray-800 dark:text-[#9cf3db] dark:ring-gray-700">
              <Sparkles className="h-3 w-3" />
              Conversation guidée
            </span>
          </div>

          <div className="relative max-h-[54vh] space-y-3 overflow-y-auto pr-1">
            <div className="flex items-start gap-2">
              <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#e9fffa] ring-1 ring-[#bdeedd]">
                <Wand2 className="h-3.5 w-3.5 text-[#156B68]" />
              </div>
              <div className="relative rounded-2xl rounded-tl-sm border border-[#d6f4ec] bg-[#f4fffb] px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                Je m'occupe de générer automatiquement ces champs:
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredFields.map((field) => (
                    <span
                      key={field}
                      className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#0f5f5c] ring-1 ring-[#d2f8ee] dark:bg-gray-900 dark:ring-gray-700"
                    >
                      {field}
                    </span>
                  ))}
                </div>
                <div className="absolute -left-1 top-3 h-2.5 w-2.5 rotate-45 border-b border-l border-[#d6f4ec] bg-[#f4fffb] dark:border-gray-700 dark:bg-gray-800" />
              </div>
            </div>

            <div className="relative ml-8 rounded-2xl rounded-tr-sm border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Studio meublé à Owendo, proche pédiatrie, 35m², cuisine équipée..."
                className="h-28 w-full resize-none rounded-xl border border-gray-200 bg-[#f8fffd] px-3 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-[#156B68] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                autoFocus
                disabled={isLoading}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDescription(prompt)}
                    className="rounded-full border border-[#ccefe7] bg-[#f3fffb] px-2.5 py-1 text-[11px] font-medium text-[#146B67] transition-colors hover:bg-[#e7fbf4]"
                    disabled={isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="absolute -right-1 top-4 h-2.5 w-2.5 rotate-45 border-r border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
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
              <div className="ml-8 space-y-2 rounded-2xl border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/70">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0f5f5c] to-[#1c7f79] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Génération...' : 'Envoyer'}
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-500 dark:text-gray-400">
              {creditsAvailable} crédit{creditsAvailable > 1 ? 's' : ''} disponible{creditsAvailable > 1 ? 's' : ''}
            </p>
          </div>

          <div className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 border-b border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" />
        </div>
      </div>
    </div>
  )
}
