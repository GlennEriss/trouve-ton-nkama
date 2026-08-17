'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FormProvider, useForm } from 'react-hook-form'
import { ZodError } from 'zod'
import { Loader2, ImagePlus, Sparkles, X } from 'lucide-react'

import { Button } from '@trouve-ton-nkama/ui/button'
import { Card, CardContent } from '@trouve-ton-nkama/ui/card'
import { Label } from '@trouve-ton-nkama/ui/label'
import { Switch } from '@trouve-ton-nkama/ui/switch'
import { Textarea } from '@trouve-ton-nkama/ui/textarea'
import LocationPicker from '@/components/location/LocationPicker'
import { useImageDropzone } from '@/hooks/useImageDropzone'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useOnSubmitFormProperty } from '@/hooks/useOnSubmitFormProperty'
import { useToast } from '@/hooks/use-toast'
import { DirectorFactory } from '@/directors/factory.director'
import { createFile } from '@/db/file.db'
import { createProperty } from '@/db/property.db'
import { routes } from '@/constantes/routes'
import { MAX_IMAGES_UPLOAD } from '@/constantes'
import type { ProcessedFormData } from '@/services/ai-form.service'
import type { Property, TypeProperty } from '@/models/annonce'
import {
  ApartmentSchema, BuildingSchema, DeskSchema, HomeSchema, StudioSchema, ShopSchema,
  KioskSchema, RoomSchema, VillaSchema, DuplexSchema, WarehouseSchema, PropertySchema,
} from '@/models/schema'

const DRAFT_CREDIT_COST = 1

// Même mapping type -> schéma complet que usePropertyFormSchema.ts, dupliqué
// volontairement en pur (pas de hook) car appelé après coup dans le handler,
// une fois le type connu — impossible d'appeler un hook dynamiquement ici.
function getFullSchemaForType(type: TypeProperty) {
  switch (type) {
    case 'Apartment': return ApartmentSchema
    case 'Building': return BuildingSchema
    case 'Desk': return DeskSchema
    case 'Home': return HomeSchema
    case 'Studio': return StudioSchema
    case 'Shop': return ShopSchema
    case 'Kiosk': return KioskSchema
    case 'Room': return RoomSchema
    case 'Villa': return VillaSchema
    case 'Duplex': return DuplexSchema
    case 'Warehouse': return WarehouseSchema
    default: return PropertySchema
  }
}

type PropertyDraftResponse = ProcessedFormData & {
  typeProperty: TypeProperty
  whatsappContact?: string
  callContact?: string
  additionalContacts?: string[]
}

async function requestPropertyDraft(description: string): Promise<PropertyDraftResponse> {
  const response = await fetch('/api/ai/property-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  const body = await response.json()
  if (!body.success) {
    throw new Error(body.error?.message ?? "Échec de la génération de l'annonce.")
  }
  return body.data as PropertyDraftResponse
}

export default function CreatePropertyWithAIPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { user } = useCurrentUser()
  const { toast } = useToast()

  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Section localisation : LocationPicker lit/écrit via useFormContext, donc
  // on lui fournit son propre petit formulaire RHF isolé (pas de resolver ici
  // — la validation complète se fait via le schéma zod du type détecté, une
  // fois l'IA revenue).
  const locationForm = useForm<any>({
    defaultValues: {
      address: { district: '', city: '', province: '' },
      cityPlaceId: '', districtPlaceId: '', locationSource: 'UNVERIFIED',
      country: 'Gabon', countryCode: 'GA',
      longitude: 0, latitude: 0, isLocExact: false,
      provinceLon: 0, provinceLat: 0, cityLon: 0, cityLat: 0, streetLon: 0, streetLat: 0,
    },
  })

  // `property` n'est utilisé par le hook que comme base par défaut avant
  // fusion avec les données passées à onSubmit — un squelette vide suffit,
  // les vraies valeurs (typeProperty inclus) viennent de `finalData` plus bas.
  const { onSubmit: submitProperty } = useOnSubmitFormProperty({} as Property, [], false)

  const { getRootProps, getInputProps, isDragActive, isProcessing } = useImageDropzone({
    onFiles: (files) => {
      const merged = [...images, ...files].slice(0, MAX_IMAGES_UPLOAD)
      const droppedCount = images.length + files.length - merged.length
      if (droppedCount > 0) {
        toast({
          title: "Certaines images n'ont pas été ajoutées",
          description: `La limite maximale de ${MAX_IMAGES_UPLOAD} images est atteinte.`,
          variant: 'destructive',
        })
      }
      setImages(merged)
      setImagePreviews((prev) =>
        [...prev, ...files.map((file) => URL.createObjectURL(file))].slice(0, MAX_IMAGES_UPLOAD),
      )
    },
    onFeedback: (feedback) => {
      const messages: string[] = []
      if (feedback.invalidTypeCount > 0) {
        messages.push(`${feedback.invalidTypeCount} image(s) ignorée(s) : format non supporté (PNG/JPG/JPEG/WEBP).`)
      }
      if (feedback.tooManyFilesCount > 0) {
        messages.push(`Maximum ${MAX_IMAGES_UPLOAD} images par ajout.`)
      }
      if (feedback.oversizedAfterCompressionCount > 0) {
        messages.push(`${feedback.oversizedAfterCompressionCount} image(s) trop lourde(s) même après compression (limite 300 Ko).`)
      }
      if (feedback.compressionErrorCount > 0) {
        messages.push(`${feedback.compressionErrorCount} image(s) n'ont pas pu être compressée(s).`)
      }
      if (messages.length > 0) {
        toast({
          title: "Certaines images n'ont pas été ajoutées",
          description: messages.join(' '),
          variant: 'destructive',
        })
      }
    },
  })

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const credits = session?.user?.credits ?? 0
  const canGenerate = credits >= DRAFT_CREDIT_COST && !generating

  const missingUpfrontFields = useMemo(() => {
    const missing: string[] = []
    if (description.trim().length < 10) missing.push('une description')
    if (images.length === 0) missing.push('au moins une photo')
    return missing
  }, [description, images])

  const handleGenerate = useCallback(async () => {
    setError(null)

    const location = locationForm.getValues()
    const locationMissing =
      !location.address?.district || !location.address?.city || !location.address?.province || !location.cityPlaceId
    if (locationMissing) {
      setError('Sélectionne une ville et un quartier avant de générer.')
      return
    }
    if (missingUpfrontFields.length > 0) {
      setError(`Complète d'abord : ${missingUpfrontFields.join(', ')}.`)
      return
    }

    setGenerating(true)
    try {
      // Upload AVANT l'appel IA, qui est ce qui débite le crédit (voir /api/ai/property-draft).
      // Dans l'autre sens, un upload qui échoue laisse l'annonceur facturé sans annonce —
      // constaté en prod le 2026-08-17.
      const uploadedImages = await Promise.all(
        images.map((file) => createFile(file, user?.uid, 'property')),
      )

      const aiData = await requestPropertyDraft(description)
      const skeleton = DirectorFactory.createDirectorProperty(aiData.typeProperty).build()

      const rawForValidation = {
        ...skeleton,
        ...aiData,
        images: uploadedImages,
        isOwner,
        contact: aiData.contact || user?.phoneNumbers?.[0] || '',
        ...location,
      }

      const schema = getFullSchemaForType(aiData.typeProperty)
      const validated = schema.parse(rawForValidation) as Record<string, unknown>
      // Le schéma zod ignore les clés non déclarées (dont typeProperty) — on
      // la remet après coup.
      const finalData = { ...validated, typeProperty: aiData.typeProperty }

      const propertyMutate = await submitProperty(finalData, uploadedImages)
      const propertyId = await createProperty(propertyMutate)
      if (!propertyId) {
        throw new Error("La création de l'annonce a échoué. Réessaie.")
      }

      router.push(`${routes.protected.add_property_ai}/preview/${propertyId}`)
    } catch (cause) {
      if (cause instanceof ZodError) {
        setError(cause.issues[0]?.message ?? 'Données invalides.')
      } else {
        setError(cause instanceof Error ? cause.message : 'Échec de la génération.')
      }
    } finally {
      setGenerating(false)
    }
  }, [description, images, isOwner, locationForm, missingUpfrontFields, router, submitProperty, user?.phoneNumbers])

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Créer une annonce avec l&apos;IA</h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Décris ton bien, ajoute des photos et un quartier — l&apos;IA détermine le type de bien et rédige
        le reste. Tu pourras tout corriger juste après, annonce par annonce.
      </p>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label htmlFor="description">Description du bien</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex : Studio meublé à louer à Akébé Poteau, 1 chambre, 1 cuisine, sécurisé, 150 000 FCFA/mois. Contact 077..."
            rows={6}
            disabled={generating}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label>Photos</Label>
          <div
            {...getRootProps()}
            className={`flex flex-wrap gap-3 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <input {...getInputProps()} disabled={generating} />
            {imagePreviews.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={src} className="relative h-20 w-20">
                <img src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    removeImage(index)
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow"
                  aria-label="Supprimer cette photo"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-slate-200 text-slate-400 dark:border-slate-700">
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px]">Ajouter</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <FormProvider {...locationForm}>
            <LocationPicker />
          </FormProvider>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <Label htmlFor="is-owner">Vous êtes le propriétaire de ce bien ?</Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sinon, l&apos;annonce sera marquée comme gérée par une agence/un intermédiaire.
            </p>
          </div>
          <Switch id="is-owner" checked={isOwner} onCheckedChange={setIsOwner} />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Coût : {DRAFT_CREDIT_COST} crédit — {credits} disponible{credits > 1 ? 's' : ''}
        </span>
        <Button onClick={handleGenerate} disabled={!canGenerate}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération…
            </>
          ) : (
            "Générer l'annonce"
          )}
        </Button>
      </div>
      {credits < DRAFT_CREDIT_COST ? (
        <p className="text-xs text-amber-600">
          Crédits insuffisants — rechargez votre compte pour utiliser l&apos;assistant IA.
        </p>
      ) : null}
    </div>
  )
}
