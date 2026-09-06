'use client'

import { useEffect } from 'react'
import { isChunkLoadError } from './chunk-load-error'

const RELOADED_ONCE_KEY = 'ttn:error-boundary:reloaded-once'

/**
 * Recharge la page automatiquement quand l'erreur attrapée par error.tsx/global-error.tsx est
 * une erreur de chunk (voir chunk-load-error.ts) — un déploiement a eu lieu pendant que l'onglet
 * était déjà ouvert. Une seule tentative par session (sessionStorage) : si l'erreur persiste
 * après rechargement, ce n'est pas ce cas-là, pas la peine de boucler indéfiniment.
 */
export function useChunkErrorRecovery(error: unknown) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)

    if (!isChunkLoadError(error)) return

    let alreadyReloaded = false
    try {
      alreadyReloaded = sessionStorage.getItem(RELOADED_ONCE_KEY) === '1'
    } catch {
      // Stockage indisponible (navigation privée stricte...) : on retente quand même une fois.
    }
    if (alreadyReloaded) return

    try {
      sessionStorage.setItem(RELOADED_ONCE_KEY, '1')
    } catch {
      // ignore
    }
    window.location.reload()
  }, [error])
}
