'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  Home, 
  Building2, 
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  MapPinIcon,
  Crosshair
} from 'lucide-react'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { UseFormReturn } from 'react-hook-form'
import { useToast } from '@/hooks/use-toast'

// Import dynamique de la carte pour éviter les erreurs SSR
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
})

interface LocationPickerProps {
  form: UseFormReturn<any>
}

interface PhotonResult {
  properties: {
    name: string
    city?: string
    state?: string
    country: string
    district?: string
    suburb?: string
    neighbourhood?: string
    osm_key: string
    osm_value: string
    type?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}



// Fonction pour debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function LocationPicker({ form }: LocationPickerProps) {
  const [districtQuery, setDistrictQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PhotonResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<PhotonResult | null>(null)
  const [mapCoordinates, setMapCoordinates] = useState<[number, number] | null>(null)

  const { register, watch, setValue, formState: { errors }, clearErrors } = form
  const { toast } = useToast()

  // Watch pour les animations
  const watchedFields = watch([
    'address.district',
    'address.city',
    'address.province'
  ])

  // Debounce la recherche
  const debouncedQuery = useDebounce(districtQuery, 500)

  // Fonction pour rechercher avec Photon API
  const searchWithPhoton = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Bounding box du Gabon: [ouest, sud, est, nord]
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filtrer pour ne garder que les résultats du Gabon
        const gabonResults = data.features.filter((result: PhotonResult) => 
          result.properties.country === 'Gabon' || result.properties.country === 'GA'
        )
        setSearchResults(gabonResults)
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Photon:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Effet pour déclencher la recherche
  useEffect(() => {
    if (debouncedQuery) {
      searchWithPhoton(debouncedQuery)
      setShowResults(true)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [debouncedQuery, searchWithPhoton])

  // Fonction pour sélectionner un résultat
  const handleLocationSelect = (result: PhotonResult) => {
    const { properties, geometry } = result
    
    setSelectedLocation(result)
    setDistrictQuery(properties.name)
    setShowResults(false)
    
    // Mettre à jour les coordonnées de la carte
    setMapCoordinates(geometry.coordinates)

    // Remplir automatiquement les champs disponibles
    setValue('address.district', properties.name)
    setValue('address.city', properties.city || properties.suburb || '')
    setValue('address.province', properties.state || '')
    // Coordonées par niveau
    const [lon, lat] = geometry.coordinates
    setValue('streetLon', lon)
    setValue('streetLat', lat)
    if (properties.city || properties.suburb) {
      setValue('cityLon', lon)
      setValue('cityLat', lat)
    }
    if (properties.state) {
      setValue('provinceLon', lon)
      setValue('provinceLat', lat)
    }
  }

  // Fonction pour formater l'affichage des résultats
  const formatResultDisplay = (result: PhotonResult) => {
    const { properties } = result
    const parts = [
      properties.name,
      properties.city || properties.suburb,
      properties.state
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  // Fonction pour la géolocalisation GPS avec remplissage automatique
  const handleGPSLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          })
        })

        const { latitude, longitude } = position.coords
        setMapCoordinates([longitude, latitude])
        console.log('GPS Location:', { latitude, longitude })

        // Remplir automatiquement les champs avec la géolocalisation
        try {
          // Utiliser Photon pour obtenir les informations de localisation
          const response = await fetch(
            `https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}&limit=1&lang=fr`
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data.features && data.features.length > 0) {
              const result = data.features[0]
              const { properties } = result
              
                             // Vérifier que c'est bien au Gabon
               if (properties.country === 'Gabon' || properties.country === 'GA') {
                 setSelectedLocation(result)
                 setDistrictQuery(properties.name)
                 
                 // Remplir automatiquement les champs
                 setValue('address.district', properties.name)
                 setValue('address.city', properties.city || properties.suburb || '')
                 setValue('address.province', properties.state || '')
                 // Renseigner les coordonnées par niveau via GPS
                 setValue('streetLon', longitude)
                 setValue('streetLat', latitude)
                 setValue('cityLon', longitude)
                 setValue('cityLat', latitude)
                 setValue('provinceLon', longitude)
                 setValue('provinceLat', latitude)
                 
                 console.log('Localisation automatique:', properties)
                 
                 toast({
                   duration: 5000,
                   title: 'Localisation détectée',
                   description: 'Votre position GPS a été utilisée pour remplir automatiquement les champs.',
                   variant: 'success',
                 })
               } else {
                 toast({
                   duration: 5000,
                   title: 'Position hors du Gabon',
                   description: 'Votre position GPS ne semble pas être au Gabon. Veuillez utiliser la recherche manuelle.',
                   variant: 'destructive',
                 })
               }
            }
          }
                 } catch (error) {
           console.error('Erreur lors de la récupération des informations de localisation:', error)
           toast({
             duration: 5000,
             title: 'Erreur de localisation',
             description: 'Impossible de récupérer les informations de localisation. Veuillez utiliser la recherche manuelle.',
             variant: 'destructive',
           })
         }
             } catch (error) {
         console.error('Erreur GPS:', error)
         toast({
           duration: 5000,
           title: 'Erreur GPS',
           description: 'Impossible d\'obtenir votre position GPS. Veuillez utiliser la recherche manuelle.',
           variant: 'destructive',
         })
       }
     } else {
       toast({
         duration: 5000,
         title: 'Géolocalisation non supportée',
         description: 'La géolocalisation n\'est pas supportée par votre navigateur. Veuillez utiliser la recherche manuelle.',
         variant: 'destructive',
       })
     }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <MapPin className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-lg">Localisation du bien</span>
        </div>
                 <p className="text-[#224D62]/80 text-sm font-medium">
           Choisissez votre méthode de localisation préférée
         </p>
       </div>

       {/* Options de localisation */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
         {/* Option 1: Localisation exacte */}
         <div className="p-4 bg-gradient-to-br from-[#CBB171]/10 to-[#224D62]/5 rounded-lg border border-[#CBB171]/20">
           <div className="flex items-center space-x-2 mb-2">
             <Crosshair className="w-5 h-5 text-[#CBB171]" />
             <span className="text-[#224D62] font-semibold text-sm">Localisation exacte</span>
           </div>
           <p className="text-[#224D62]/70 text-xs mb-3">
             Utilisez votre position GPS actuelle pour remplir automatiquement tous les champs.
           </p>
         </div>

         {/* Option 2: Recherche manuelle */}
         <div className="p-4 bg-gradient-to-br from-[#224D62]/10 to-[#CBB171]/5 rounded-lg border border-[#224D62]/20">
           <div className="flex items-center space-x-2 mb-2">
             <Search className="w-5 h-5 text-[#224D62]" />
             <span className="text-[#224D62] font-semibold text-sm">Recherche manuelle</span>
           </div>
           <p className="text-[#224D62]/70 text-xs mb-3">
             Tapez le nom de votre quartier et sélectionnez-le dans la liste.
           </p>
         </div>
       </div>

       {/* Carte intégrée */}
       <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-4 shadow-lg border border-[#224D62]/20">
         <LocationMap coordinates={mapCoordinates} districtName={selectedLocation?.properties.name} />
       </div>

       {/* Bouton de localisation exacte */}
       <div className="text-center space-y-3">
         <p className="text-[#224D62]/70 text-xs font-medium max-w-md mx-auto">
           Cliquez ici pour utiliser votre position GPS actuelle. Le quartier, la ville et la province seront automatiquement remplis.
         </p>
                   <Button
            type="button"
            size="lg"
            onClick={handleGPSLocation}
            className="bg-[#156B68] hover:bg-[#156B68]/90 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0"
          >
            <Crosshair className="w-5 h-5 mr-3 text-white" />
            Utiliser ma position actuelle
          </Button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Colonne de gauche - Recherche de quartier */}
        <div className="space-y-4 w-full">
          {/* Recherche de quartier */}
          <div className="space-y-2">
            <Label htmlFor="districtSearch" className="text-sm font-medium text-[#224D62]">
              Rechercher votre quartier <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              <Input
                id="districtSearch"
                value={districtQuery}
                onChange={(e) => setDistrictQuery(e.target.value)}
                placeholder="Ex: Glass, Akanda, Lalala..."
                className={cn(
                  "pl-10 pr-12 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                  (errors?.address as any)?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                  selectedLocation && "border-[#CBB171] bg-[#CBB171]/5"
                )}
              />
              
              {/* Loading spinner */}
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
              )}
              
              {/* Success checkmark */}
              {selectedLocation && !isSearching && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              )}

              {/* Résultats de recherche */}
              {showResults && searchResults.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg w-full max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {searchResults.map((result, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-sm p-3"
                          onClick={() => handleLocationSelect(result)}
                        >
                          <div className="flex items-start space-x-2 w-full">
                            <MapPinIcon className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-[#224D62]">
                                {result.properties.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatResultDisplay(result)}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {(errors?.address as any)?.district && (
              <div className="flex items-center space-x-1 text-red-500 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>{(errors.address as any)?.district?.message}</span>
              </div>
            )}
          </div>

          {/* Informations automatiques */}
          {selectedLocation && (
            <div className="p-4 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-4 h-4 text-[#CBB171]" />
                <span className="text-sm font-medium text-[#224D62]">
                  Localisation détectée
                </span>
              </div>
              <div className="text-xs text-[#224D62]/80">
                {selectedLocation && formatResultDisplay(selectedLocation)}
              </div>
            </div>
          )}
        </div>

        {/* Colonne de droite - Champs automatiques */}
        <div className="space-y-4 w-full">
          {/* Ville (automatique) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#224D62]">
              Ville <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full">
              <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.city')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

          {/* Province (automatique) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#224D62]">
              Province <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.province')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

          {/* Quartier (automatique) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#224D62]">
              Quartier <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-xs">
                Automatique
              </Badge>
            </Label>
            <div className="relative w-full">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                {...register('address.district')}
                disabled
                placeholder="Sélectionnez d'abord un quartier"
                className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
              />
            </div>
          </div>

          

          
        </div>
      </div>
    </div>
  )
}
