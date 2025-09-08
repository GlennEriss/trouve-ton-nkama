'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { usePhotonSearch } from '@/hooks/usePhotonSearch'
import { useFormContext } from 'react-hook-form'
import { PhotonResult } from '@/models/PhotonResult'
import { useLocationHandlers } from '@/hooks/useLocationHandlers'

// Import dynamique de la carte pour éviter les erreurs SSR
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
})




export default function LocationPicker() {
  const { register, formState: { errors } } = useFormContext<any>()

  // Handlers et états de logique métier centralisés
  const { 
    handleLocationSelect, 
    handleGPSLocation,
    selectedLocation,
    districtQuery,
    setDistrictQuery,
    mapCoordinates
  } = useLocationHandlers()

  // Recherche Photon via hook
  const { results, isLoading } = usePhotonSearch(districtQuery, 500)
  
  // State dérivé - fermer les résultats si une location est sélectionnée
  const showResults = !!districtQuery && results.length > 0 && !selectedLocation

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
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-[#156B68]/10 to-[#156B68]/5 rounded-lg p-4 border border-[#156B68]/20">
            <p className="text-[#224D62]/80 text-sm font-medium mb-2">
              📍 Utilisez votre position GPS actuelle
            </p>
            <p className="text-[#224D62]/60 text-xs mb-3">
              Le quartier, la ville et la province seront automatiquement remplis.
            </p>
            <div className="space-y-2">
              <Button
                type="button"
                size="lg"
                onClick={handleGPSLocation}
                className="bg-[#156B68] hover:bg-[#156B68]/90 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0"
              >
                <Crosshair className="w-5 h-5 mr-3 text-white" />
                Utiliser ma position actuelle
              </Button>
              <p className="text-[#224D62]/50 text-xs">
                💡 Si l'autorisation a été refusée, suivez les instructions dans le message d'erreur
              </p>
            </div>
          </div>
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
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
              )}
              
              {/* Success checkmark */}
              {selectedLocation && !isLoading && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
              )}

              {/* Résultats de recherche */}
              {showResults && results.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg w-full max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {results.map((result: PhotonResult, index: number) => (
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
