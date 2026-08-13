'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react'
import { GABON_PROVINCES } from '@trouve-ton-nkama/core/domain'

import { Button } from '@trouve-ton-nkama/ui/button'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useImageDropzone } from '@/hooks/useImageDropzone'
import { useToast } from '@/hooks/use-toast'
import { createFile } from '@/db/file.db'
import { createProperty } from '@/db/property.db'
import { routes } from '@/constantes/routes'
import { MAX_IMAGES_UPLOAD } from '@/constantes'
import type { Property } from '@/models/annonce'
import type { PublishableCategoryLeaf } from '@/app/api/categories/publishable-leaves/route'

type LeavesPayload = { leaves: PublishableCategoryLeaf[] }

async function fetchPublishableLeaves(): Promise<PublishableCategoryLeaf[]> {
  const response = await fetch('/api/categories/publishable-leaves')
  if (!response.ok) return []
  const data = (await response.json()) as LeavesPayload
  return Array.isArray(data.leaves) ? data.leaves : []
}

type AIDraft = {
  categoryId: string
  title: string
  description: string
  price: number | null
  city: string | null
  attributes: Record<string, string | number | boolean>
}

async function requestCategoryListingDraft(description: string): Promise<AIDraft> {
  const response = await fetch('/api/ai/category-listing-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  const payload = (await response.json()) as
    | { success: true; data: AIDraft }
    | { success: false; error?: { message?: string } }
  if (!response.ok || !payload.success) {
    throw new Error(payload.success ? "Échec de la génération." : payload.error?.message)
  }
  return payload.data
}

export default function CreateCategoryListingPage() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { toast } = useToast()

  const { data: leaves = [] } = useQuery({
    queryKey: ['categories', 'publishable-leaves'],
    queryFn: fetchPublishableLeaves,
    staleTime: 1000 * 60 * 10,
  })

  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isProcessing } = useImageDropzone({
    onFiles: (files) => {
      const merged = [...images, ...files].slice(0, MAX_IMAGES_UPLOAD)
      setImages(merged)
      setImagePreviews((previous) =>
        [...previous, ...files.map((file) => URL.createObjectURL(file))].slice(0, MAX_IMAGES_UPLOAD),
      )
    },
    onFeedback: (feedback) => {
      if (feedback.tooManyFilesCount > 0) {
        toast({ title: 'Trop de photos', description: `Maximum ${MAX_IMAGES_UPLOAD} photos.`, variant: 'destructive' })
      }
    },
  })

  const removeImage = useCallback((index: number) => {
    setImages((previous) => previous.filter((_, i) => i !== index))
    setImagePreviews((previous) => previous.filter((_, i) => i !== index))
  }, [])

  const missingUpfrontFields = useMemo(() => {
    const missing: string[] = []
    if (description.trim().length < 10) missing.push('une description')
    if (images.length === 0) missing.push('au moins une photo')
    return missing
  }, [description, images])

  const handleGenerate = useCallback(async () => {
    setError(null)

    if (leaves.length === 0) {
      setError("Aucune catégorie n'accepte de nouvelles annonces pour le moment.")
      return
    }
    if (missingUpfrontFields.length > 0) {
      setError(`Complète d'abord : ${missingUpfrontFields.join(', ')}.`)
      return
    }
    const contact = user?.phoneNumbers?.[0] ?? ''
    if (!contact) {
      setError('Ajoute un numéro de téléphone à ton profil avant de publier.')
      return
    }

    setIsGenerating(true)
    try {
      const draft = await requestCategoryListingDraft(description)
      const matchedCategory = leaves.find((leaf) => leaf.id === draft.categoryId)
      if (!matchedCategory) {
        throw new Error("Catégorie détectée introuvable. Réessaie.")
      }

      const attributes: Record<string, string | number | boolean> = {}
      for (const field of matchedCategory.attributeSchema) {
        const value = draft.attributes[field.key]
        if (value !== undefined) attributes[field.key] = value
      }

      const uploadedImages = await Promise.all(images.map((file) => createFile(file, user!.uid, 'property')))
      const provinceMeta = GABON_PROVINCES[0]

      const property = {
        title: draft.title,
        description: draft.description,
        price: draft.price ?? 0,
        images: uploadedImages,
        categoryId: matchedCategory.id,
        categoryPath: { lvl0: matchedCategory.rootName, lvl1: `${matchedCategory.rootName} > ${matchedCategory.name}` },
        attributes,
        street: '',
        city: draft.city ?? '',
        province: provinceMeta.name,
        country: 'Gabon',
        countryCode: 'GA',
        latitude: provinceMeta.lat,
        longitude: provinceMeta.lng,
        isLocExact: false,
        locationSource: 'UNVERIFIED',
        contact,
        createdBy: user!.uid,
        tags: [],
        state: 'IN_PROGRESS',
      } as unknown as Property

      const propertyId = await createProperty(property)
      if (!propertyId) {
        throw new Error("Impossible de créer l'annonce.")
      }

      router.push(`${routes.protected.add_category_listing}/preview/${propertyId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec de la génération.')
    } finally {
      setIsGenerating(false)
    }
  }, [description, images, leaves, missingUpfrontFields, router, user])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white leading-tight">
          Décrivez votre annonce et laissez l&apos;IA faire le reste
        </h1>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex : Robe Zara taille M, portée deux fois, très bon état. Disponible à Libreville. Prix 15 000 FCFA, légèrement négociable."
            rows={7}
            disabled={isGenerating}
            className="w-full resize-none border-0 bg-transparent p-6 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3">
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} disabled={isGenerating} />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-colors"
                aria-label="Ajouter des photos"
                title="Ajouter des photos"
                disabled={isGenerating}
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              </button>
            </div>
            {images.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {images.length} photo{images.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={src} className="relative h-20 w-20">
                <img src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
                  aria-label="Supprimer cette photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button onClick={() => void handleGenerate()} disabled={isGenerating} size="lg" className="w-full gap-2">
          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          Générer l&apos;annonce
        </Button>
      </div>
    </div>
  )
}
