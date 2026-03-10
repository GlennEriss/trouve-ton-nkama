'use client'

import React, { useRef, useState } from 'react'
import { Wand2, X, Send, ImagePlus } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import imageCompression from 'browser-image-compression'
import { MAX_IMAGES_UPLOAD } from '@/constantes'

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#156B68' }}
            >
              <Wand2 className="w-4 h-4" style={{ color: '#1de9b6' }} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Assistant IA</h2>
              <p className="text-xs text-gray-500">Génération automatique</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-5">
          {/* Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2 font-medium">
              Champs générés automatiquement :
            </p>
            <div className="flex flex-wrap gap-2">
              {requiredFields.map((field) => (
                <span
                  key={field}
                  className="text-xs px-2 py-1 rounded-full text-gray-600"
                  style={{ backgroundColor: '#e6fffa' }}
                >
                  {field}
                </span>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Décrivez votre bien
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Appartement 3 pièces de 75m² avec balcon, cuisine équipée, proche métro..."
              className="w-full h-28 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 focus:ring-[#156B68]"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Images (optionnel)
              </label>
              <span className="text-xs text-gray-500">
                {selectedImages.length}/{MAX_IMAGES_UPLOAD}
              </span>
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

            <button
              type="button"
              onClick={handleAddImagesClick}
              disabled={isLoading || isProcessingImages || selectedImages.length >= MAX_IMAGES_UPLOAD}
              className="w-full py-2.5 px-4 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ImagePlus className="w-4 h-4" />
              <span>{isProcessingImages ? 'Traitement des images...' : 'Ajouter des images'}</span>
            </button>

            {selectedImages.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto space-y-2">
                {selectedImages.map((image, index) => (
                  <div
                    key={`${image.name}-${image.size}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <span className="text-xs text-gray-700 truncate pr-3">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="text-xs text-red-600 hover:text-red-700"
                      disabled={isLoading}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!description.trim() || !canGenerate || isLoading || isProcessingImages}
              className="flex-1 py-2.5 px-4 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
              style={{ backgroundColor: '#156B68' }}
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? 'Génération...' : 'Générer'}</span>
            </button>
          </div>

          {/* Crédits */}
          <div className="text-center mt-3">
            <span className="text-xs text-gray-500">
              {creditsAvailable} crédit{creditsAvailable > 1 ? 's' : ''} disponible{creditsAvailable > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
