'use client'

import { ChangeEvent, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@trouve-ton-nkama/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trouve-ton-nkama/ui/dialog'
import { MAX_IMAGES_UPLOAD } from '@/constantes'
import { uploadPropertyImages } from '@/db/file.db'
import type { Image } from '@/models/annonce'
import { resolveThumbnailUrl } from '@/lib/property-images'

type ListingImagesEditorProps = Readonly<{
  images: Image[]
  ownerId?: string
  onSave: (images: Image[]) => Promise<unknown>
}>

export default function ListingImagesEditor({ images, ownerId, onSave }: ListingImagesEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageToDelete, setImageToDelete] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    const invalid = selected.some((file) => !file.type.startsWith('image/'))
    if (invalid) {
      setError('Sélectionne uniquement des fichiers image.')
      return
    }

    const remainingSlots = MAX_IMAGES_UPLOAD - images.length
    if (remainingSlots <= 0) {
      setError(`La limite de ${MAX_IMAGES_UPLOAD} photos est atteinte.`)
      return
    }

    setError(null)
    setIsUploading(true)
    try {
      const storageLocation = ownerId ? `property/${ownerId}` : 'property'
      const uploaded = await uploadPropertyImages(selected.slice(0, remainingSlots), ownerId, storageLocation)
      await onSave([...images, ...uploaded])
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Impossible d'ajouter les photos.")
    } finally {
      setIsUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (imageToDelete === null) return
    if (images.length <= 1) {
      setError("Une annonce doit conserver au moins une photo.")
      setImageToDelete(null)
      return
    }

    setError(null)
    setIsDeleting(true)
    try {
      await onSave(images.filter((_, index) => index !== imageToDelete))
      setImageToDelete(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Impossible de supprimer la photo.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">Photos de l&apos;annonce</h2>
          <p className="text-xs text-gray-500">{images.length}/{MAX_IMAGES_UPLOAD} photos · au moins une photo requise</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Choisir des photos à ajouter"
          onChange={(event) => void addImages(event)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || isDeleting || images.length >= MAX_IMAGES_UPLOAD}
        >
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {isUploading ? 'Ajout en cours…' : 'Ajouter des photos'}
        </Button>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <div key={`${image.filePATH || image.fileURL}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveThumbnailUrl(image) || image.fileURL} alt={`Photo ${index + 1} de l'annonce`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Supprimer la photo ${index + 1}`}
              onClick={() => setImageToDelete(index)}
              disabled={isUploading || isDeleting}
              className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={imageToDelete !== null} onOpenChange={(open) => !open && !isDeleting && setImageToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl" isDefaultIconClose={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Supprimer cette photo ?</DialogTitle>
            <DialogDescription>
              Elle ne sera plus visible dans l&apos;annonce. Cette action devra être confirmée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setImageToDelete(null)} disabled={isDeleting}>Annuler</Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? 'Suppression…' : 'Supprimer la photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
