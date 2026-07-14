'use client'

import { useCallback } from 'react'

const DB_NAME = 'location_maison_reel_drafts'
const DB_VERSION = 1
const STORE_NAME = 'draft_video'
const STORAGE_KEY = 'reel_form_draft_video'

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
 * Persiste la vidéo (File) du brouillon de réel dans IndexedDB, pour qu'elle survive à une
 * redirection externe complète (ex: OAuth Google) — mirror de usePropertyDraftImagesStorage
 * pour un seul fichier au lieu d'un tableau.
 */
export function useReelDraftVideoStorage() {
  const saveDraftVideo = useCallback(async (file: File | null | undefined) => {
    if (!file) return

    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(file, STORAGE_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // Persistance best-effort : ne doit jamais bloquer le parcours de publication.
    }
  }, [])

  const loadDraftVideo = useCallback(async (): Promise<File | null> => {
    try {
      const db = await openDb()
      return await new Promise<File | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(STORAGE_KEY)
        request.onsuccess = () => resolve(request.result instanceof File ? request.result : null)
        request.onerror = () => reject(request.error)
      })
    } catch {
      return null
    }
  }, [])

  const clearDraftVideo = useCallback(async () => {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(STORAGE_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // no-op
    }
  }, [])

  return { saveDraftVideo, loadDraftVideo, clearDraftVideo }
}
