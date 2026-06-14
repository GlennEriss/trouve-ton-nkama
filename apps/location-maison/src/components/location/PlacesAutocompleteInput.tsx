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
  placeholder?: string
  disabled?: boolean
  bias?: { lat: number; lng: number } | null
  hasError?: boolean
}

export default function PlacesAutocompleteInput({
  value,
  onSelect,
  onClear,
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
      setQuery(resolved.name || suggestion.mainText)
      setSelected(true)
      onSelect(resolved)
    }
  }

  const showDropdown = isOpen && (suggestions.length > 0 || (!isLoading && status !== 'empty'))

  return (
    <div ref={containerRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && !selected && setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          'pl-10 pr-10 w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all',
          hasError && 'border-red-300 focus:border-red-500 bg-red-50/50',
          selected && 'border-[#CBB171] bg-[#CBB171]/5',
        )}
      />

      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
      )}
      {selected && !isLoading && (
        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
      )}

      {showDropdown && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg w-full max-h-64 overflow-y-auto">
          <CardContent className="p-2">
            {suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <Button
                    key={s.placeId}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left hover:bg-[#224D62]/5 text-sm p-3 h-auto"
                    onClick={() => handlePick(s)}
                  >
                    <div className="flex items-start space-x-2 w-full">
                      <MapPin className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-[#224D62]">{s.mainText}</div>
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
