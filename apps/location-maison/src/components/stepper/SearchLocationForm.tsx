'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  MapPin, 
  Loader2, 
  X, 
  Navigation,
  Building,
  Home,
  CheckCircle,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocationSearch, useLocationSuggestions, type PhotonResult } from '@/hooks/use-location-search'
import { useLocationSync } from '@/hooks/use-location-sync'

export default function SearchLocationForm() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<PhotonResult | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const { setValue, watch } = useFormContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Hook de synchronisation avec Firebase
  const { forceSync, locationExists, isSyncing } = useLocationSync()
  
  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  // Recherche avec le terme debouncé
  const { data: results = [], isLoading, error } = useLocationSearch(debouncedSearchTerm, isOpen && debouncedSearchTerm.length >= 2)
  
  // Suggestions d'auto-complétion (pour les termes courts)
  const { data: suggestions = [] } = useLocationSuggestions(searchTerm, showSuggestions && searchTerm.length >= 1 && searchTerm.length < 3)
  
  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Gérer la sélection d'une suggestion
  const handleSelectSuggestion = useCallback((suggestionText: string) => {
    setSearchTerm(suggestionText)
    setDebouncedSearchTerm(suggestionText)
    setShowSuggestions(false)
    setIsOpen(true) // Ouvrir pour montrer les résultats de recherche
  }, [])
  
  // Gérer la sélection d'un résultat
  const handleSelectResult = useCallback(async (result: PhotonResult) => {
    const { name, city, state: province, country, countrycode } = result.properties
    const [longitude, latitude] = result.geometry.coordinates
    
    // Mise à jour des champs du formulaire
    setValue('province', province || '')
    setValue('city', city || name || '')
    setValue('street', name || '')
    setValue('country', country || '')
    setValue('countryCode', countrycode || '')
    setValue('latitude', latitude)
    setValue('longitude', longitude)
    
    // Mise à jour de l'état local
    setSelectedResult(result)
    setSearchTerm(name || '')
    setIsOpen(false)
    setShowSuggestions(false)
    
    // Synchronisation avec Firebase si nécessaire
    if (province && (city || name) && name) {
      const targetProvince = province.trim()
      const targetCity = (city || name).trim()
      const targetStreet = name.trim()
      
      // Vérifier si la localité existe déjà dans Firebase
      if (!locationExists(targetProvince, targetCity, targetStreet)) {
        try {
          await forceSync(targetProvince, targetCity, targetStreet)
          console.log(`🔄 Nouvelle localité synchronisée: ${targetProvince} > ${targetCity} > ${targetStreet}`)
        } catch (error) {
          console.warn('⚠️ Synchronisation Firebase échouée:', error)
          // L'erreur est gérée dans le hook, on continue normalement
        }
      }
    }
    
    // Focus retour sur l'input
    setTimeout(() => inputRef.current?.blur(), 100)
  }, [setValue, locationExists, forceSync])
  
  // Gérer les changements d'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // Logique d'affichage du dropdown
    if (value.length >= 2) {
      setIsOpen(true)
      setShowSuggestions(false)
    } else if (value.length >= 1) {
      setIsOpen(false)
      setShowSuggestions(true)
    } else {
      setIsOpen(false)
      setShowSuggestions(false)
    }
    
    // Réinitialiser la sélection si l'utilisateur modifie
    if (selectedResult && value !== selectedResult.properties.name) {
      setSelectedResult(null)
    }
  }
  
  // Effacer la recherche
  const handleClear = () => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setSelectedResult(null)
    setIsOpen(false)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }
  
  // Gérer l'ouverture du dropdown
  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setIsOpen(true)
      setShowSuggestions(false)
    } else if (searchTerm.length >= 1) {
      setIsOpen(false)
      setShowSuggestions(true)
    }
  }
  
  // Obtenir l'icône selon le type de lieu
  const getLocationIcon = (result: PhotonResult) => {
    const { osm_key, osm_value } = result.properties
    
    if (osm_key === 'place' && osm_value === 'city') return Building
    if (osm_key === 'place' && osm_value === 'town') return Home
    if (osm_key === 'place' && osm_value === 'village') return Home
    return MapPin
  }
  
  // Formater l'affichage d'un résultat
  const formatResultDisplay = (result: PhotonResult) => {
    const { name, city, state } = result.properties
    const parts = []
    
    if (name) parts.push(name)
    if (city && city !== name) parts.push(city)
    if (state && state !== city) parts.push(state)
    
    return parts.join(', ')
  }
  
  return (
    <div className="relative w-full">
      {/* Zone de recherche principale */}
      <div className="relative">
        <div className={cn(
          "relative flex items-center bg-white border-2 rounded-xl transition-all duration-300",
          isOpen || selectedResult 
            ? "border-[#156B69] shadow-lg ring-4 ring-[#156B69]/10" 
            : "border-gray-200 hover:border-[#156B69]/50",
          "focus-within:border-[#156B69] focus-within:shadow-lg focus-within:ring-4 focus-within:ring-[#156B69]/10"
        )}>
          
          {/* Icône de recherche */}
          <div className="pl-4 pr-3 flex items-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-[#156B69] animate-spin" />
            ) : isSyncing ? (
              <Database className="w-5 h-5 text-orange-500 animate-pulse" />
            ) : selectedResult ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          {/* Input de recherche */}
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="Rechercher une localité au Gabon..."
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-gray-400"
          />
          
          {/* Bouton d'effacement */}
          {(searchTerm || selectedResult) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 mr-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          
          {/* Indicateur de géolocalisation */}
          <div className="pr-4 pl-2">
            <Navigation className="w-4 h-4 text-[#156B69]" />
          </div>
        </div>
        
        {/* Message d'aide */}
        <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>
            {isSyncing 
              ? "Synchronisation avec la base de données..."
              : selectedResult 
                ? "Localité sélectionnée - Les champs ci-dessous ont été mis à jour"
                : showSuggestions && suggestions.length > 0
                  ? `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} disponible${suggestions.length > 1 ? 's' : ''}`
                  : isOpen && results.length > 0
                    ? `${results.length} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`
                    : searchTerm.length >= 2 
                      ? "Recherche en cours..."
                      : searchTerm.length >= 1
                        ? "Tapez un caractère de plus pour rechercher"
                        : "Tapez pour voir les suggestions ou rechercher une localité"
            }
          </span>
        </div>
      </div>
      
      {/* Dropdown des résultats ou suggestions */}
      {(isOpen || showSuggestions) && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 border-2 border-[#156B69]/20 shadow-2xl animate-in fade-in-0 slide-in-from-top-2 duration-200"
        >
          <CardContent className="p-0">
            {/* Affichage des suggestions d'auto-complétion */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                    <Search className="w-3 h-3" />
                    <span>Suggestions de recherche</span>
                  </div>
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`suggestion-${index}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion.text)}
                    className="w-full p-3 text-left hover:bg-[#156B69]/5 transition-colors duration-200 border-b border-gray-50 last:border-b-0 focus:bg-[#156B69]/5 focus:outline-none"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <div 
                          className="text-sm text-gray-700"
                          dangerouslySetInnerHTML={{ __html: suggestion.highlighted }}
                        />
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              suggestion.type === 'popular' && "bg-orange-100 text-orange-700",
                              suggestion.type === 'autocomplete' && "bg-blue-100 text-blue-700"
                            )}
                          >
                            {suggestion.type === 'popular' ? 'Populaire' : 'Suggestion'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Affichage des résultats de recherche */}
            {isOpen && (
              <>
                {error ? (
                  <div className="p-4 text-center">
                    <div className="text-red-500 text-sm">
                      Erreur lors de la recherche. Vérifiez votre connexion.
                    </div>
                  </div>
                ) : results.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                      <div className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>Localités trouvées</span>
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                      </div>
                    </div>
                    {results.map((result, index) => {
                      const IconComponent = getLocationIcon(result)
                      const displayText = formatResultDisplay(result)
                      const { state, city, osm_value } = result.properties
                      
                      return (
                        <button
                          key={`result-${result.properties.name}-${index}`}
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          className="w-full p-4 text-left hover:bg-[#156B69]/5 transition-colors duration-200 border-b border-gray-100 last:border-b-0 focus:bg-[#156B69]/5 focus:outline-none"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <IconComponent className="w-4 h-4 text-[#156B69]" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {result.properties.name}
                              </div>
                              
                              <div className="flex items-center space-x-2 mt-1">
                                {city && city !== result.properties.name && (
                                  <Badge variant="secondary" className="text-xs bg-gray-100">
                                    {city}
                                  </Badge>
                                )}
                                {state && (
                                  <Badge variant="secondary" className="text-xs bg-[#156B69]/10 text-[#156B69]">
                                    {state}
                                  </Badge>
                                )}
                                {osm_value && (
                                  <span className="text-xs text-gray-500 capitalize">
                                    {osm_value}
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-500 mt-1">
                                📍 {displayText}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : searchTerm.length >= 2 && !isLoading ? (
                  <div className="p-8 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <div className="text-gray-500 text-sm">
                      Aucune localité trouvée pour "{searchTerm}"
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Essayez avec un autre terme de recherche
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Résultat sélectionné */}
      {selectedResult && (
        <Card className="mt-4 border-2 border-green-200 bg-green-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-green-800">
                  Localité sélectionnée : {selectedResult.properties.name}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {formatResultDisplay(selectedResult)}
                </div>
                <div className="text-xs text-green-500 mt-2 space-y-1">
                  <div>✓ Les champs Province, Ville et Quartier ont été automatiquement remplis</div>
                  {!locationExists(
                    selectedResult.properties.state || '',
                    selectedResult.properties.city || selectedResult.properties.name || '',
                    selectedResult.properties.name || ''
                  ) && (
                    <div className="flex items-center space-x-1">
                      <Database className="w-3 h-3" />
                      <span>Nouvelle localité ajoutée aux suggestions</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}