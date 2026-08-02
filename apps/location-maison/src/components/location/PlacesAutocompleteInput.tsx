'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Search, Loader2, CheckCircle, MapPin, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { trackLocationNoResult } from '@/features/analytics/location/services/location-search-analytics.client'
import {
  useGooglePlaces,
  PlaceSuggestion,
  ResolvedPlace,
  SuggestStatus,
} from '@/hooks/google-map/use-google-places'

interface PlacesAutocompleteInputProps {
  inputId: string
  kind: 'city' | 'district'
  /** Valeur affichée (ex: nom déjà sélectionné). */
  value: string
  /** Une valeur n'est valide que si elle vient d'un placeId résolu. */
  isVerified: boolean
  onSelect: (place: ResolvedPlace) => void
  /** Notifie l'effacement / la modification manuelle du champ. */
  onClear?: () => void
  /** Permet de conserver une saisie libre si aucune suggestion n'est choisie. */
  onManualChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  bias?: { lat: number; lng: number } | null
  province?: string
  city?: string
  hasError?: boolean
}

export default function PlacesAutocompleteInput({
  inputId,
  kind,
  value,
  isVerified,
  onSelect,
  onClear,
  onManualChange,
  placeholder,
  disabled,
  bias,
  province,
  city,
  hasError,
}: PlacesAutocompleteInputProps) {
  const { fetchSuggestions, resolvePlace } = useGooglePlaces()
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [status, setStatus] = useState<SuggestStatus>('empty')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(isVerified)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeq = useRef(0)

  // Synchronise l'affichage si la valeur externe change (restauration / GPS).
  useEffect(() => {
    setQuery(value)
    setSelected(isVerified)
  }, [isVerified, value])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  // Ferme la liste au clic extérieur.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChange = (text: string) => {
    setQuery(text)
    setSelected(false)
    onClear?.()
    onManualChange?.(text)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.trim().length < 2) {
      setSuggestions([])
      setStatus('empty')
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setIsOpen(true)
    const seq = ++requestSeq.current
    debounceRef.current = setTimeout(async () => {
      const result = await fetchSuggestions(text, { bias, kind, province, city })
      // Ignore les réponses obsolètes (frappe rapide).
      if (seq !== requestSeq.current) return
      setSuggestions(result.items)
      setStatus(result.status)
      setIsLoading(false)
      if (result.status === 'empty') {
        trackLocationNoResult({ query: text, kind, province, city })
      }
    }, 350)
  }

  const handlePick = async (suggestion: PlaceSuggestion) => {
    setIsOpen(false)
    setIsLoading(true)
    const resolved = suggestion.place ?? await resolvePlace(suggestion.placeId)
    setIsLoading(false)
    if (resolved) {
      // Le nom retenu doit être celui que l'utilisateur a vu et cliqué (mainText
      // de la suggestion), pas le displayName de Place Details qui peut différer
      // (ex: « Owendo » sélectionné → displayName « Port d'Owendo »). Les détails
      // ne servent qu'aux coordonnées et aux composants (ville / province).
      const chosen = { ...resolved, name: suggestion.mainText || resolved.name }
      setQuery(chosen.name)
      setSelected(true)
      onSelect(chosen)
    } else {
      setStatus('error')
      setIsOpen(true)
    }
  }

  const showDropdown = isOpen && (suggestions.length > 0 || (!isLoading && status !== 'empty'))
  const selectionRequired = query.trim().length > 0 && !selected && !isLoading

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          'border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 px-4 items-center group transition-colors focus-within:border-secondary',
          (hasError || selectionRequired) && 'border-red-300 focus-within:border-red-500',
          disabled && 'opacity-60',
        )}
      >
        <Search
          size={22}
          className="text-gray-400 group-focus-within:stroke-secondary transition-colors shrink-0"
        />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && !selected && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={`${inputId}-suggestions`}
          aria-invalid={hasError || selectionRequired}
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 ml-2"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-secondary animate-spin shrink-0" />}
        {selected && !isLoading && <CheckCircle className="w-4 h-4 text-secondary shrink-0" />}
      </div>

      {selectionRequired && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Sélectionnez un lieu proposé pour valider ce champ.
        </p>
      )}

      {showDropdown && (
        <Card
          id={`${inputId}-suggestions`}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-20 border border-gray-200 shadow-lg w-full max-h-64 overflow-y-auto rounded-2xl"
        >
          <CardContent className="p-2">
            {suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <Button
                    key={s.placeId}
                    role="option"
                    aria-selected="false"
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left hover:bg-primary-50 text-sm p-3 h-auto rounded-xl"
                    onClick={() => handlePick(s)}
                  >
                    <div className="flex items-start space-x-2 w-full">
                      <MapPin className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-gray-800 dark:text-white">{s.mainText}</div>
                        {s.secondaryText && (
                          <div className="text-xs text-gray-500">{s.secondaryText}</div>
                        )}
                        <div className="mt-1 text-[11px] font-medium text-primary">
                          {s.source === 'OFFICIAL_CATALOG'
                            ? 'Lieu vérifié Trouve Ton Nkama'
                            : 'Google Maps'}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
                <div className="px-3 pb-1 pt-2 text-right text-[11px] font-medium text-gray-400">
                  Catalogue officiel et Google Maps
                </div>
              </div>
            ) : status === 'error' ? (
              <div className="flex items-start gap-2 p-3 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Service de recherche indisponible. Vérifiez que l&apos;API Google Places est activée.
                </span>
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-500">Aucun résultat trouvé.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
