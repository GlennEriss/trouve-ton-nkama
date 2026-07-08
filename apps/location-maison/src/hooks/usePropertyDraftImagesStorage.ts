'use client'

import { useCallback } from 'react'
import { TypeProperty } from '@/models/annonce'

const DB_NAME = 'location_maison_property_drafts'
const DB_VERSION = 1
const STORE_NAME = 'draft_images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB indisponible'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Persiste les photos (File) du brouillon d'annonce dans IndexedDB, pour qu'elles
 * survivent à une redirection externe complète (ex: OAuth Google) — contrairement au
 * localStorage utilisé pour les champs texte, IndexedDB peut stocker des Blob/File.
 */
export function usePropertyDraftImagesStorage(typeProperty?: TypeProperty | string) {
  const getStorageKey = useCallback(() => {
    return typeProperty ? `property_form_draft_${typeProperty.toLowerCase()}_images` : 'property_form_draft_images'
  }, [typeProperty])

  const saveDraftImages = useCallback(async (images: Array<File | string> | undefined) => {
    const files = (images ?? []).filter((img): img is File => img instanceof File)
    if (files.length === 0) return

    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(files, getStorageKey())
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // Persistance best-effort : ne doit jamais bloquer le parcours de publication.
    }
  }, [getStorageKey])

  const loadDraftImages = useCallback(async (): Promise<File[]> => {
    try {
      const db = await openDb()
      return await new Promise<File[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(getStorageKey())
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
        request.onerror = () => reject(request.error)
      })
    } catch {
      return []
    }
  }, [getStorageKey])

  const clearDraftImages = useCallback(async () => {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(getStorageKey())
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // no-op
    }
  }, [getStorageKey])

  return { saveDraftImages, loadDraftImages, clearDraftImages }
}
