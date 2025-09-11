import { useMemo } from 'react'
import { TypeProperty } from '@/models/annonce'
import {
  Step1Schema,
  Step3Schema,
  HomeStep2Schema,
  StudioStep2Schema,
  ApartmentStep2Schema,
  VillaStep2Schema,
  DeskStep2Schema,
  BuildingStep2Schema,
  ApartmentSchema,
  BuildingSchema,
  DeskSchema,
  HomeSchema,
  StudioSchema,
  VillaSchema,
  KioskSchema,
  RoomSchema,
  ShopSchema,
  PropertySchema
} from '@/models/schema'
import { z } from 'zod'

/**
 * Hook pour gérer la sélection des schémas de validation
 * en fonction de l'étape actuelle et du type de propriété
 */
export function usePropertyFormSchema(
  activeStep: number,
  typeProperty: TypeProperty
) {
  // Schéma pour le step 2 selon le type de propriété
  const getStep2Schema = (type: TypeProperty) => {
    switch (type) {
      case 'Home':
        return HomeStep2Schema
      case 'Studio':
        return StudioStep2Schema
      case 'Apartment':
        return ApartmentStep2Schema
      case 'Villa':
        return VillaStep2Schema
      case 'Desk':
        return DeskStep2Schema
      case 'Building':
        return BuildingStep2Schema
      default:
        return z.object({}) // Schéma vide pour les autres types
    }
  }

  // Schéma complet selon le type de propriété
  const getFullSchema = (type: TypeProperty) => {
    switch (type) {
      case 'Apartment':
        return ApartmentSchema
      case 'Building':
        return BuildingSchema
      case 'Desk':
        return DeskSchema
      case 'Home':
        return HomeSchema
      case 'Studio':
        return StudioSchema
      case 'Shop':
        return ShopSchema
      case 'Kiosk':
        return KioskSchema
      case 'Room':
        return RoomSchema
      case 'Villa':
        return VillaSchema
      default:
        return PropertySchema
    }
  }

  // Schéma actuel selon l'étape
  const currentStepSchema = useMemo(() => {
    switch (activeStep) {
      case 0: // Step 1
        return Step1Schema
      case 1: // Step 2
        return getStep2Schema(typeProperty)
      case 2: // Step 3
        return Step3Schema
      default:
        return getFullSchema(typeProperty)
    }
  }, [activeStep, typeProperty])

  // Schéma complet pour la soumission finale
  const fullSchema = useMemo(() => {
    return getFullSchema(typeProperty)
  }, [typeProperty])

  return {
    currentStepSchema,
    fullSchema,
    getStep2Schema,
    getFullSchema
  }
}
