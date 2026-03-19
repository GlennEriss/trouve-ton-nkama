'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, X, Send } from 'lucide-react'
import { FiPlus } from 'react-icons/fi'
import { createLogger } from '@/lib/logger'
import { useWindowSize } from '@/hooks/useSize'
import { useCurrentUser } from '@/hooks/use-current-user'
import imageCompression from 'browser-image-compression'
import { MAX_IMAGES_UPLOAD } from '@/constantes'

const logger = createLogger('components.ai-assistant-modal')
const IMAGE_MAX_SIZE_BYTES = 300 * 1024

interface UploadedImage {
  file: File
  previewUrl: string
}

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
  const [selectedImages, setSelectedImages] = useState<UploadedImage[]>([])
  const [isProcessingImages, setIsProcessingImages] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const selectedImagesRef = useRef<UploadedImage[]>([])
  const { width } = useWindowSize()
  const { user } = useCurrentUser()

  const isMobileViewport = width === 0 || width < 768
  const hasBottomNavigation = Boolean(user && isMobileViewport)
  const mobileBottomOffset = hasBottomNavigation ? 176 : 104

  useEffect(() => {
    selectedImagesRef.current = selectedImages
  }, [selectedImages])

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  const handleGenerate = async () => {
    if (!description.trim() || !canGenerate || isLoading || isProcessingImages) return

    try {
      await onGenerate(
        description.trim(),
        selectedImages.map((image) => image.file)
      )
      setDescription('')
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      setSelectedImages([])
      setPreviewImageUrl(null)
      onClose()
    } catch (error) {
      logger.error('Erreur lors de la génération', { error })
    }
  }

  const handleClose = () => {
    setDescription('')
    selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setSelectedImages([])
    setPreviewImageUrl(null)
    onClose()
  }

  const handleAddImagesClick = () => {
    imageInputRef.current?.click()
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages((current) => {
      const imageToRemove = current[index]
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
        if (previewImageUrl === imageToRemove.previewUrl) {
          setPreviewImageUrl(null)
        }
      }
      return current.filter((_, imageIndex) => imageIndex !== index)
    })
  }

  const handleImagesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    const remainingSlots = Math.max(MAX_IMAGES_UPLOAD - selectedImages.length, 0)
    if (remainingSlots === 0) return

    setIsProcessingImages(true)

    try {
      const uploadedImages: UploadedImage[] = []

      for (const file of files.slice(0, remainingSlots)) {
        const compressedBlob = (await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1920
        })) as Blob

        const compressedFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type || file.type
        })

        if (compressedFile.size <= IMAGE_MAX_SIZE_BYTES) {
          uploadedImages.push({
            file: compressedFile,
            previewUrl: URL.createObjectURL(compressedFile)
          })
        }
      }

      if (uploadedImages.length > 0) {
        setSelectedImages((current) => [...current, ...uploadedImages].slice(0, MAX_IMAGES_UPLOAD))
      }
    } catch (error) {
      logger.error("Impossible de préparer les images pour l'assistant IA", { error })
    } finally {
      setIsProcessingImages(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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

                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImagesSelected}
                    disabled={isLoading || isProcessingImages}
                  />

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddImagesClick}
                      disabled={isLoading || isProcessingImages || selectedImages.length >= MAX_IMAGES_UPLOAD}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      aria-label="Ajouter des images"
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>

                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                      {selectedImages.map((image, index) => (
                        <div key={`${image.file.name}-${image.file.size}-${index}`} className="relative h-10 w-10 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(image.previewUrl)}
                            className="h-full w-full overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
                            aria-label={`Aperçu image ${index + 1}`}
                          >
                            <img
                              src={image.previewUrl}
                              alt={`Aperçu image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-white"
                            aria-label={`Retirer image ${index + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <motion.button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!description.trim() || !canGenerate || isLoading || isProcessingImages}
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

          <AnimatePresence>
            {previewImageUrl && (
              <motion.div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
                onClick={() => setPreviewImageUrl(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.img
                  src={previewImageUrl}
                  alt="Aperçu plein écran"
                  className="max-h-[80vh] max-w-[90vw] rounded-lg border border-white/30 shadow-2xl"
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  onClick={(event) => event.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
