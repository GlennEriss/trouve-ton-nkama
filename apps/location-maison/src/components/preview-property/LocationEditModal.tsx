'use client'

import React, { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@trouve-ton-nkama/ui/dialog'
import { Button } from '@trouve-ton-nkama/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Property } from '@/models/annonce'
import LocationPicker from '@/components/location/LocationPicker'

// Mêmes règles que les champs de localisation de PropertySchemaBase (src/models/schema.ts) :
// on ne reprend ici que ce que LocationPicker lit/écrit réellement, pas tout le schéma de
// création (titre, prix, images...).
export const LocationEditSchema = z.object({
  address: z.object({
    district: z.string().min(1, 'Le nom du quartier est obligatoire'),
    city: z.string().min(1, 'Le nom de la ville est obligatoire'),
    province: z.string().min(1, 'Le nom de la province est obligatoire'),
  }),
  cityPlaceId: z.string().min(1, 'Sélectionnez une ville proposée'),
  districtPlaceId: z.string().optional(),
  locationSource: z.enum(['OFFICIAL_CATALOG', 'GOOGLE_PLACES', 'GPS', 'LEGACY', 'UNVERIFIED']),
  longitude: z.number().refine((val) => val >= -180 && val <= 180, 'Longitude invalide'),
  latitude: z.number().refine((val) => val >= -90 && val <= 90, 'Latitude invalide'),
  country: z.string().min(1, 'Le pays est obligatoire'),
  countryCode: z.string().min(2, 'Le code pays est obligatoire'),
  isLocExact: z.boolean().optional(),
  provinceLon: z.number().optional(),
  provinceLat: z.number().optional(),
  cityLon: z.number().optional(),
  cityLat: z.number().optional(),
  streetLon: z.number().optional(),
  streetLat: z.number().optional(),
})

export type LocationEditFormValues = z.infer<typeof LocationEditSchema>

/**
 * Valeurs par défaut du formulaire local à partir de l'annonce persistée. La persistance ne
 * connaît qu'un seul couple longitude/latitude (pas de décomposition province/ville/quartier) —
 * même repli que `sanitizeLocationFields` dans `property.form.provider.tsx`.
 */
export function buildLocationDefaultValues(property: Property): LocationEditFormValues {
  return {
    address: {
      district: property.street ?? '',
      city: property.city ?? '',
      province: property.province ?? '',
    },
    cityPlaceId: property.cityPlaceId ?? '',
    districtPlaceId: property.districtPlaceId ?? '',
    locationSource: property.locationSource ?? 'LEGACY',
    longitude: property.longitude ?? 0,
    latitude: property.latitude ?? 0,
    country: property.country ?? 'Gabon',
    countryCode: property.countryCode ?? 'GA',
    isLocExact: property.isLocExact ?? false,
    provinceLon: 0,
    provinceLat: 0,
    cityLon: 0,
    cityLat: 0,
    streetLon: property.longitude ?? 0,
    streetLat: property.latitude ?? 0,
  }
}

/**
 * Patch plat attendu par `updateProperty`/la route PATCH — l'inverse de
 * `buildLocationDefaultValues`. `longitude`/`latitude` sont déjà les coordonnées les plus
 * précises disponibles : le mediator (`Step3FormPropertyMediator.setCoordinates`) les met à jour
 * à chaque sélection ville/quartier, pas seulement les champs auxiliaires `streetLon/streetLat`.
 */
export function buildLocationPatch(values: LocationEditFormValues): Partial<Property> {
  return {
    street: values.address.district,
    city: values.address.city,
    province: values.address.province,
    cityPlaceId: values.cityPlaceId,
    districtPlaceId: values.districtPlaceId ?? '',
    locationSource: values.locationSource,
    longitude: values.longitude,
    latitude: values.latitude,
    country: values.country,
    countryCode: values.countryCode,
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

interface LocationEditModalProps {
  property: Property
  isOpen: boolean
  onClose: () => void
  onSave: (patch: Partial<Property>) => Promise<void>
}

export function LocationEditModal({ property, isOpen, onClose, onSave }: Readonly<LocationEditModalProps>) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<LocationEditFormValues>({
    resolver: zodResolver(LocationEditSchema),
    defaultValues: buildLocationDefaultValues(property),
  })

  // Repart des valeurs actuelles de l'annonce à chaque ouverture — y compris après une
  // précédente annulation (le formulaire local garde ses valeurs modifiées tant qu'il n'est
  // pas remonté).
  useEffect(() => {
    if (isOpen) {
      form.reset(buildLocationDefaultValues(property))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, property])

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true)
    try {
      await onSave(buildLocationPatch(values))
      onClose()
    } catch (error) {
      toast({
        duration: 5000,
        title: 'Modification de la localisation échouée',
        description: getErrorMessage(error, 'Impossible de mettre à jour la localisation. Réessayez.'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-9 h-9 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            Modifier la localisation
          </DialogTitle>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <LocationPicker />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
