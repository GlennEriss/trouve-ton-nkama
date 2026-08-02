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
  Crosshair,
  Edit3,
  Check,
  X
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

export default function SmartLocationPicker() {
  const { register, formState: { errors } } = useFormContext<any>()

  // Handlers et états de logique métier centralisés
  const { 
    handleLocationSelect, 
    handleGPSLocation,
    selectedLocation,
    districtQuery,
    setDistrictQuery,
    mapCoordinates,
    isEditingDistrict,
    handleEnableDistrictEdit,
    handleConfirmDistrictEdit,
    handleCancelDistrictEdit
  } = useLocationHandlers()

  // Recherche Photon via hook
  const { results, isLoading } = usePhotonSearch(districtQuery, 500)
  
  // State dérivé - fermer les résultats si une location est sélectionnée ou en cours d'édition
  const showResults = !!districtQuery && results.length > 0 && !selectedLocation && !isEditingDistrict

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
      {/* Options de localisation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Option 1: Localisation exacte */}
        <div className="p-4 bg-gradient-to-br from-gold/10 to-ink/5 rounded-lg border border-gold/20">
          <div className="flex items-center space-x-2 mb-2">
            <Crosshair className="w-5 h-5 text-gold" />
            <span className="text-ink font-semibold text-sm">Localisation exacte</span>
          </div>
          <p className="text-ink/70 text-xs mb-3">
            Utilisez votre position GPS actuelle pour remplir automatiquement tous les champs.
          </p>
        </div>

        {/* Option 2: Recherche manuelle */}
        <div className="p-4 bg-gradient-to-br from-ink/10 to-gold/5 rounded-lg border border-ink/20">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="w-5 h-5 text-ink" />
            <span className="text-ink font-semibold text-sm">Recherche manuelle</span>
          </div>
          <p className="text-ink/70 text-xs mb-3">
            Tapez le nom de votre quartier et sélectionnez-le dans la liste.
          </p>
        </div>
      </div>

      {/* Carte intégrée */}
      <div className="relative overflow-hidden bg-gradient-to-br from-ink/5 via-gold/5 to-ink/10 rounded-2xl p-4 shadow-lg border border-ink/20">
        <LocationMap coordinates={mapCoordinates} districtName={selectedLocation?.properties.name} />
      </div>

      {/* Bouton de localisation exacte */}
      <div className="text-center space-y-4">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <p className="text-ink/80 text-sm font-medium mb-2 flex items-center justify-center">
            <MapPin className="w-4 h-4 mr-2" />
            Utilisez votre position GPS actuelle
          </p>
          <p className="text-ink/60 text-xs mb-3">
            Le quartier, la ville et la province seront automatiquement remplis.
          </p>
          <div className="space-y-2">
            <Button
              type="button"
              size="lg"
              onClick={handleGPSLocation}
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0"
            >
              <Crosshair className="w-5 h-5 mr-3 text-white" />
              Utiliser ma position actuelle
            </Button>
            <p className="text-ink/50 text-xs">
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
            <Label htmlFor="districtSearch" className="text-sm font-medium text-ink">
              Rechercher votre quartier <span className="text-red-500">*</span>
            </Label>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gold z-10" />
              <Input
                id="districtSearch"
                value={districtQuery}
                onChange={(e) => setDistrictQuery(e.target.value)}
                placeholder="Ex: Glass, Akanda, Lalala..."
                className={cn(
                  "pl-10 pr-12 border-gold/30 focus:border-ink focus:ring-ink/20 transition-all duration-300 w-full",
                  (errors?.address as any)?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                  selectedLocation && "border-gold bg-gold/5"
                )}
              />
              
              {/* Loading spinner */}
              {isLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gold animate-spin z-10" />
              )}
              
              {/* Success checkmark */}
              {selectedLocation && !isLoading && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gold z-10" />
              )}

              {/* Résultats de recherche */}
              {showResults && results.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-gold/30 shadow-lg w-full max-h-64 overflow-y-auto">
                  <CardContent className="p-2">
                    <div className="space-y-1">
                      {results.map((result: PhotonResult, index: number) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left hover:bg-ink/5 transition-colors text-sm p-3"
                          onClick={() => handleLocationSelect(result)}
                        >
                          <div className="flex items-start space-x-2 w-full">
                            <MapPinIcon className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium text-ink">
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
          {selectedLocation && !isEditingDistrict && (
            <div className="p-4 bg-gold/5 rounded-lg border border-gold/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-ink">
                  Localisation détectée
                </span>
              </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleEnableDistrictEdit}
                  className="text-ink hover:bg-ink/10 h-8 px-2"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Modifier
                </Button>
              </div>
              <div className="text-xs text-ink/80 mb-2">
                {selectedLocation && formatResultDisplay(selectedLocation)}
              </div>
              <div className="text-xs text-ink/60 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                💡 Le quartier "<strong>{districtQuery || selectedLocation.properties.name}</strong>" 
                {districtQuery && districtQuery !== selectedLocation.properties.name 
                  ? " a été personnalisé" 
                  : " a été détecté"}. 
                Si ce nom est correct, continuez. Sinon, cliquez sur "Modifier" pour le personnaliser.
              </div>
            </div>
          )}

          {/* Mode édition du quartier */}
          {selectedLocation && isEditingDistrict && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-2 mb-3">
                <Edit3 className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Modification du nom du quartier
                </span>
              </div>
              <div className="text-xs text-yellow-700 mb-3">
                Personnalisez le nom du quartier si nécessaire :
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmDistrictEdit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Confirmer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelDistrictEdit}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Colonne de droite - Champs automatiques */}
        <div className="space-y-4 w-full">
          {/* Ville (automatique) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Ville <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-ink/10 text-ink text-xs">
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
            <Label className="text-sm font-medium text-ink">
              Province <span className="text-red-500">*</span>
              <Badge variant="secondary" className="ml-2 bg-ink/10 text-ink text-xs">
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

          {/* Quartier (conditionnellement éditable) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-ink">
              Quartier <span className="text-red-500">*</span>
              {!isEditingDistrict && (
                <Badge variant="secondary" className="ml-2 bg-ink/10 text-ink text-xs">
                  Automatique
                </Badge>
              )}
              {isEditingDistrict && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                  Édition
                </Badge>
              )}
            </Label>
            <div className="relative w-full">
              <MapPin className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
                isEditingDistrict ? "text-gold" : "text-gray-400"
              )} />
              <Input
                {...register('address.district')}
                value={districtQuery || (selectedLocation?.properties.name || '')}
                onChange={isEditingDistrict ? (e) => setDistrictQuery(e.target.value) : undefined}
                disabled={!isEditingDistrict}
                placeholder={isEditingDistrict ? "Tapez le nom du quartier..." : "Sélectionnez d'abord un quartier"}
                className={cn(
                  "pl-10 w-full",
                  isEditingDistrict 
                    ? "border-gold/30 focus:border-ink focus:ring-ink/20 bg-white" 
                    : "bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

