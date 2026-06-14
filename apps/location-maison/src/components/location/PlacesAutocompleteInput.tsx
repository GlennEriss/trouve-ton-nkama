'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Search, Loader2, CheckCircle, MapPin, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  useGooglePlaces,
  PlaceSuggestion,
  ResolvedPlace,
  SuggestStatus,
} from '@/hooks/google-map/use-google-places'

interface PlacesAutocompleteInputProps {
  /** Valeur affichée (ex: nom déjà sélectionné). */
  value: string
  onSelect: (place: ResolvedPlace) => void
  /** Notifie l'effacement / la modification manuelle du champ. */
  onClear?: () => void
  /** Permet de conserver une saisie libre si aucune suggestion n'est choisie. */
  onManualChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  bias?: { lat: number; lng: number } | null
  hasError?: boolean
}

export default function PlacesAutocompleteInput({
  value,
  onSelect,
  onClear,
  onManualChange,
  placeholder,
  disabled,
  bias,
  hasError,
}: PlacesAutocompleteInputProps) {
  const { fetchSuggestions, resolvePlace } = useGooglePlaces()
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [status, setStatus] = useState<SuggestStatus>('empty')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(!!value)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeq = useRef(0)

  // Synchronise l'affichage si la valeur externe change (restauration / GPS).
  useEffect(() => {
    setQuery(value)
    setSelected(!!value)
  }, [value])

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
      const result = await fetchSuggestions(text, { bias })
      // Ignore les réponses obsolètes (frappe rapide).
      if (seq !== requestSeq.current) return
      setSuggestions(result.items)
      setStatus(result.status)
      setIsLoading(false)
    }, 350)
  }

  const handlePick = async (suggestion: PlaceSuggestion) => {
    setIsOpen(false)
    setIsLoading(true)
    const resolved = await resolvePlace(suggestion.placeId)
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
    }
  }

  const showDropdown = isOpen && (suggestions.length > 0 || (!isLoading && status !== 'empty'))

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          'border border-gray-200 bg-gray-50 dark:bg-gray-900 rounded-full flex py-2 px-4 items-center group transition-colors focus-within:border-[#1FA89B]',
          hasError && 'border-red-300 focus-within:border-red-500',
          disabled && 'opacity-60',
        )}
      >
        <Search
          size={22}
          className="text-gray-400 group-focus-within:stroke-[#1FA89B] transition-colors shrink-0"
        />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && !selected && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 ml-2"
        />
        {isLoading && <Loader2 className="w-4 h-4 text-[#1FA89B] animate-spin shrink-0" />}
        {selected && !isLoading && <CheckCircle className="w-4 h-4 text-[#1FA89B] shrink-0" />}
      </div>

      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-gray-200 shadow-lg w-full max-h-64 overflow-y-auto rounded-2xl">
          <CardContent className="p-2">
            {suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <Button
                    key={s.placeId}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left hover:bg-[#ebf6f5] text-sm p-3 h-auto rounded-xl"
                    onClick={() => handlePick(s)}
                  >
                    <div className="flex items-start space-x-2 w-full">
                      <MapPin className="w-4 h-4 text-[#1FA89B] mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-gray-800 dark:text-white">{s.mainText}</div>
                        {s.secondaryText && (
                          <div className="text-xs text-gray-500">{s.secondaryText}</div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
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
