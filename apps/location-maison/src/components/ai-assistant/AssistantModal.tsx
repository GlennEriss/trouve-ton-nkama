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
      className="fixed inset-x-3 z-50 md:inset-x-auto md:right-4 md:w-[390px]"
      style={
        isMobileViewport
          ? { bottom: `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomOffset}px)` }
          : { bottom: '88px' }
      }
      role="dialog"
      aria-modal="false"
      aria-label="Assistant IA"
    >
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: '#156B68' }}
            >
              <Wand2 className="h-4 w-4" style={{ color: '#1de9b6' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Assistant IA</h2>
              <p className="text-xs text-gray-500">Mode conversation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-4 py-3">
          <div className="mb-4 flex items-start gap-2">
            <div
              className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: '#e6fffa' }}
            >
              <Wand2 className="h-3 w-3" style={{ color: '#156B68' }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Décrivez votre bien comme dans un chat. Je génère automatiquement les champs suivants :
              <div className="mt-2 flex flex-wrap gap-2">
                {requiredFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-full px-2 py-1 text-xs text-gray-600"
                    style={{ backgroundColor: '#e6fffa' }}
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Studio meublé à Owendo, proche pédiatrie, 35m², cuisine équipée, eau/électricité incluses..."
              className="h-28 w-full resize-none rounded-2xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-[#156B68]"
              autoFocus
              disabled={isLoading}
            />

            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImagesSelected}
              disabled={isLoading || isProcessingImages}
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddImagesClick}
                disabled={isLoading || isProcessingImages || selectedImages.length >= MAX_IMAGES_UPLOAD}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                {isProcessingImages ? 'Traitement...' : `Images (${selectedImages.length}/${MAX_IMAGES_UPLOAD})`}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!description.trim() || !canGenerate || isLoading || isProcessingImages}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#156B68' }}
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Génération...' : 'Envoyer'}
              </button>
            </div>

            {selectedImages.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-2">
                {selectedImages.map((image, index) => (
                  <div
                    key={`${image.name}-${image.size}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                  >
                    <span className="truncate pr-3 text-xs text-gray-700">{image.name}</span>
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
        </div>

        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-center text-xs text-gray-500">
            {creditsAvailable} crédit{creditsAvailable > 1 ? 's' : ''} disponible{creditsAvailable > 1 ? 's' : ''}
          </p>
        </div>

        <div className="absolute -bottom-1 right-8 hidden h-3 w-3 rotate-45 border-b border-r border-gray-200 bg-white md:block" />
      </div>
    </div>
  )
}
