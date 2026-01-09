'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { ProvinceCombobox } from './combobox/ProvinceCombobox'
import { CityCombobox } from './combobox/CityCombobox'
import { QuarterCombobox } from './combobox/QuarterCombobox'
import { useOSMLocations } from '@/hooks/useOSMLocations'
import { Loader2 } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import dynamic from 'next/dynamic'

// Import dynamique de la carte pour éviter les erreurs SSR
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )
})

export default function LocalLocationPicker() {
  const { isLoading, error } = useOSMLocations()
  const { watch } = useFormContext<any>()

  // Récupérer les coordonnées pour la carte depuis les champs du formulaire
  const provinceLat = watch('address.provinceLat') || 0
  const provinceLon = watch('address.provinceLon') || 0
  const cityLat = watch('address.cityLat') || 0
  const cityLon = watch('address.cityLon') || 0
  const streetLat = watch('address.streetLat') || 0
  const streetLon = watch('address.streetLon') || 0

  // Déterminer les coordonnées de la carte (priorité: quartier > ville > province)
  const getMapCoords = (): [number, number] | null => {
    if (streetLat && streetLon) {
      return [streetLon, streetLat]; // [lon, lat]
    }
    if (cityLat && cityLon) {
      return [cityLon, cityLat]; // [lon, lat]
    }
    if (provinceLat && provinceLon) {
      return [provinceLon, provinceLat]; // [lon, lat]
    }
    return [11.5, 0.5]; // Centre du Gabon par défaut [lon, lat]
  }

  const displayCoordinates = getMapCoords();
  const districtName = watch('address.district') || ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Chargement des données...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-red-800 text-sm">
          Erreur lors du chargement des données de localisation. Veuillez utiliser la recherche intelligente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {/* Description */}
      <div className="text-center space-y-2">
        <p className="text-[#224D62]/80 text-sm">
          Sélectionnez votre localisation en utilisant les listes déroulantes. 
          Les données sont issues d'OpenStreetMap et couvrent toutes les zones du Gabon.
        </p>
      </div>

      {/* Carte en haut */}
      {displayCoordinates && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-4 shadow-lg border border-[#224D62]/20">
          <LocationMap coordinates={displayCoordinates} districtName={districtName} />
        </div>
      )}

      {/* Combobox */}
      <div className="space-y-4">
        {/* Province */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62]">
            Province <span className="text-red-500">*</span>
          </Label>
          <ProvinceCombobox />
        </div>

        {/* Ville */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62]">
            Ville <span className="text-red-500">*</span>
          </Label>
          <CityCombobox />
        </div>

        {/* Quartier */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62]">
            Quartier <span className="text-red-500">*</span>
          </Label>
          <QuarterCombobox />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
        <p className="text-blue-800 text-xs">
          💡 <strong>Astuce :</strong> Commencez par sélectionner la province, puis la ville, 
          et enfin le quartier. Vous pouvez rechercher dans chaque liste en tapant le nom.
        </p>
      </div>
    </div>
  )
}

