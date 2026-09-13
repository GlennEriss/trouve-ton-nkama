'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@trouve-ton-nkama/ui/button'
import { MAX_LISTING_ZONES, normalizeCityNames } from '@/lib/listing-zones'

type EditableZonesFieldProps = {
  /** Noms de villes, dans l'ordre (zone primaire = premier élément). */
  cities: string[]
  onSave: (cities: string[]) => Promise<void>
  max?: number
  className?: string
}

/**
 * Éditeur dédié aux zones multiples d'une annonce (Mode, etc.) — champ composé, donc son
 * propre composant plutôt que d'être forcé dans `EditableField` (voir le commentaire de ce
 * dernier). Chaque ajout/suppression sauvegarde immédiatement (même principe que
 * `additionalContacts` dans PreviewPropertyDraft.tsx : liste + bouton "Ajouter", pas de
 * bascule "Modifier" globale). Voir docs/marketplace-multi-categories/
 * 08-zones-multiples-mode.md §4.2.
 */
export function EditableZonesField({ cities, onSave, max = MAX_LISTING_ZONES, className }: EditableZonesFieldProps) {
  const [draftCity, setDraftCity] = useState('')
  const [pending, setPending] = useState<'add' | number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const commit = async (next: string[], pendingState: 'add' | number) => {
    setPending(pendingState)
    setError(null)
    try {
      await onSave(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Échec de la mise à jour.')
    } finally {
      setPending(null)
    }
  }

  const removeAt = (index: number) => {
    void commit(cities.filter((_, i) => i !== index), index)
  }

  const add = () => {
    const trimmed = draftCity.trim()
    if (!trimmed) return
    const next = normalizeCityNames([...cities, trimmed], max)
    if (next.length === cities.length) {
      // Déjà présente (dédupliquée) ou plafond atteint — rien de nouveau à sauvegarder.
      setDraftCity('')
      return
    }
    void commit(next, 'add').then(() => setDraftCity(''))
  }

  const atMax = cities.length >= max

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {cities.length === 0 && (
          <p className="text-sm italic text-gray-400">Aucune zone renseignée pour l&apos;instant.</p>
        )}
        {cities.map((city, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span
            key={`${city}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {city}
            <button
              type="button"
              onClick={() => removeAt(index)}
              disabled={pending !== null}
              className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              aria-label={`Retirer ${city}`}
            >
              {pending === index ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            </button>
          </span>
        ))}
      </div>

      {!atMax ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={draftCity}
            onChange={(event) => setDraftCity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
            placeholder="Ajouter une ville (ex. Franceville)"
            disabled={pending !== null}
            className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm dark:bg-gray-900"
          />
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={pending !== null || !draftCity.trim()}>
            {pending === 'add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Ajouter
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-gray-400">Maximum {max} zones par annonce.</p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
