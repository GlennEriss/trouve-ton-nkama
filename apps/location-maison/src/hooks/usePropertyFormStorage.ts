import { useEffect, useCallback } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { TypeProperty } from '@/models/annonce'

const STORAGE_KEY = 'property_form_draft'

/**
 * Hook pour gérer la persistance localStorage du formulaire de propriété
 */
export function usePropertyFormStorage(
  form: UseFormReturn<any>,
  isUpdate: boolean = false,
  typeProperty?: TypeProperty
) {
  // Générer la clé de stockage basée sur le type de propriété
  const getStorageKey = useCallback(() => {
    return typeProperty ? `${STORAGE_KEY}_${typeProperty}` : STORAGE_KEY
  }, [typeProperty])

  // Sauvegarder les données dans localStorage
  const saveFormToLocalStorage = useCallback((data: any) => {
    if (typeof window !== 'undefined') {
      // Créer une copie des données sans les images
      const { images, ...dataWithoutImages } = data
      localStorage.setItem(getStorageKey(), JSON.stringify(dataWithoutImages))
    }
  }, [getStorageKey])

  // Récupérer les données depuis localStorage
  const getFormFromLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(getStorageKey())
      return saved ? JSON.parse(saved) : null
    }
    return null
  }, [getStorageKey])

  // Nettoyer le localStorage
  const clearFormLocalStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getStorageKey())
    }
  }, [getStorageKey])


  // Charger les données au montage et sauvegarder automatiquement les changements
  useEffect(() => {
    if (!isUpdate) {
      // Charger les données sauvegardées au montage
      const savedData = getFormFromLocalStorage()
      if (savedData) {
        // Ne pas écraser les valeurs actuelles si elles sont différentes de 0
        Object.entries(savedData).forEach(([key, value]) => {
          const currentValue = form.getValues(key as any)
          // Si la valeur actuelle est différente de 0 et que la valeur sauvegardée est 0, ne pas l'écraser
          if ((key === 'price' || key === 'area') && currentValue !== 0 && value === 0) {
            return
          }
          form.setValue(key as any, value)
        })
      }

      // Sauvegarder automatiquement les changements
      const subscription = form.watch((data) => {
        // Filtrer les données pour ne sauvegarder que les champs valides
        const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value
          }
          return acc
        }, {} as any)

        if (Object.keys(filteredData).length > 0) {
          saveFormToLocalStorage(filteredData)
        }
      })

      return () => subscription.unsubscribe()
    }
  }, [form, isUpdate, saveFormToLocalStorage, getFormFromLocalStorage])

  return {
    saveFormToLocalStorage,
    getFormFromLocalStorage,
    clearFormLocalStorage
  }
}
