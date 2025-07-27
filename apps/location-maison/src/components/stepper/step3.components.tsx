// src/components/location/UpdatedSelectComponents.tsx
"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form"
import { SelectFormApp } from "../shared/form/SelectFormApp"
import { useLocationSync } from "@/hooks/use-location-sync"
import { Badge } from "@/components/ui/badge"
import { Database, MapPin, Building } from "lucide-react"
import { cn } from "@/lib/utils"

interface OptionType {
  label: string
  value: string
}

/**
 * Composant Select pour les provinces avec synchronisation automatique
 */
export const SelectProvinceComponent = ({ field }: Readonly<{ field: any }>) => {
  const { watch } = useFormContext()
  const { locations, isLoading } = useLocationSync()
  
  // Observer les changements pour détecter les nouvelles sélections
  const selectedProvince = watch('province')
  const selectedCity = watch('city')
  const selectedStreet = watch('street')
  
  // Générer les options des provinces
  const provinceOptions = React.useMemo((): OptionType[] => {
    if (!locations) return []
    
    const provinces = Object.keys(locations)
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((province: string): OptionType => ({
        label: province,
        value: province
      }))
    
    // Si une province est sélectionnée mais n'existe pas dans les options,
    // l'ajouter temporairement (sera synchronisée via le hook)
    if (selectedProvince && !provinces.some(p => p.value === selectedProvince)) {
      provinces.push({
        label: selectedProvince,
        value: selectedProvince
      })
      provinces.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    }
    
    return provinces
  }, [locations, selectedProvince])
  
  // Déterminer si la province actuelle est nouvelle
  const isNewProvince = selectedProvince && locations && !locations[selectedProvince]
  
  return (
    <div className="space-y-2">
      <SelectFormApp
        key={`province-${selectedProvince}`} // Force re-render si changement
        control={field.control}
        id="province"
        name="province"
        options={provinceOptions}
        placeholder="Sélectionnez une province"
        value={field.value}
        disabled={isLoading}
      />
      
      {/* Indicateur de nouvelle province */}
      {isNewProvince && (
        <div className="flex items-center space-x-2 text-xs">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>Nouvelle province</span>
          </Badge>
          <span className="text-gray-500">Sera ajoutée aux suggestions</span>
        </div>
      )}
    </div>
  )
}

/**
 * Composant Select pour les villes avec synchronisation automatique
 */
export const SelectCityComponent = ({ field }: Readonly<{ field: any }>) => {
  const { watch } = useFormContext()
  const { locations, isLoading } = useLocationSync()
  
  const selectedProvince = watch('province')
  const selectedCity = watch('city')
  
  // Générer les options des villes
  const cityOptions = React.useMemo((): OptionType[] => {
    if (!locations || !selectedProvince) return []
    
    const provinceData = locations[selectedProvince] || {}
    const cities = Object.keys(provinceData)
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((city: string): OptionType => ({
        label: city,
        value: city
      }))
    
    // Si une ville est sélectionnée mais n'existe pas dans les options,
    // l'ajouter temporairement
    if (selectedCity && !cities.some(c => c.value === selectedCity)) {
      cities.push({
        label: selectedCity,
        value: selectedCity
      })
      cities.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    }
    
    return cities
  }, [locations, selectedProvince, selectedCity])
  
  // Déterminer si la ville actuelle est nouvelle
  const isNewCity = selectedProvince && selectedCity && 
    locations && locations[selectedProvince] && 
    !locations[selectedProvince][selectedCity]
  
  return (
    <div className="space-y-2">
      <SelectFormApp
        key={`city-${selectedProvince}-${selectedCity}`}
        control={field.control}
        id="city"
        name="city"
        options={cityOptions}
        placeholder={selectedProvince ? "Sélectionnez une ville" : "Sélectionnez d'abord une province"}
        value={field.value}
        disabled={!selectedProvince || isLoading}
      />
      
      {/* Indicateur de nouvelle ville */}
      {isNewCity && (
        <div className="flex items-center space-x-2 text-xs">
          <Badge variant="secondary" className="bg-green-100 text-green-700 flex items-center space-x-1">
            <Building className="w-3 h-3" />
            <span>Nouvelle ville</span>
          </Badge>
          <span className="text-gray-500">Sera ajoutée aux suggestions</span>
        </div>
      )}
      
      {/* Message d'aide conditionnel */}
      {!selectedProvince && (
        <p className="text-xs text-gray-500 flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>Sélectionnez une province pour voir les villes disponibles</span>
        </p>
      )}
    </div>
  )
}

/**
 * Composant Select pour les quartiers/rues avec synchronisation automatique
 */
export const SelectStreetComponent = ({ field }: Readonly<{ field: any }>) => {
  const { watch } = useFormContext()
  const { locations, isLoading } = useLocationSync()
  
  const selectedProvince = watch('province')
  const selectedCity = watch('city')
  const selectedStreet = watch('street')
  
  // Générer les options des quartiers/rues
  const streetOptions = React.useMemo((): OptionType[] => {
    if (!locations || !selectedProvince || !selectedCity) return []
    
    const cityData = locations[selectedProvince]?.[selectedCity] || []
    const streets = cityData
      .sort((a: string, b: string) => a.localeCompare(b, 'fr'))
      .map((street: string): OptionType => ({
        label: street,
        value: street
      }))
    
    // Si un quartier est sélectionné mais n'existe pas dans les options,
    // l'ajouter temporairement
    if (selectedStreet && !streets.some(s => s.value === selectedStreet)) {
      streets.push({
        label: selectedStreet,
        value: selectedStreet
      })
      streets.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    }
    
    return streets
  }, [locations, selectedProvince, selectedCity, selectedStreet])
  
  // Déterminer si le quartier actuel est nouveau
  const isNewStreet = selectedProvince && selectedCity && selectedStreet &&
    locations && locations[selectedProvince] && locations[selectedProvince][selectedCity] &&
    !locations[selectedProvince][selectedCity].includes(selectedStreet)
  
  // Calculer le nombre total de quartiers disponibles
  const totalStreets = selectedProvince && selectedCity && locations && 
    locations[selectedProvince] && locations[selectedProvince][selectedCity] ?
    locations[selectedProvince][selectedCity].length : 0
  
  return (
    <div className="space-y-2">
      <SelectFormApp
        key={`street-${selectedProvince}-${selectedCity}-${selectedStreet}`}
        control={field.control}
        id="street"
        name="street"
        options={streetOptions}
        placeholder={
          !selectedProvince ? "Sélectionnez d'abord une province" :
          !selectedCity ? "Sélectionnez d'abord une ville" :
          "Sélectionnez un quartier"
        }
        value={field.value}
        disabled={!selectedCity || isLoading}
      />
      
      {/* Indicateur de nouveau quartier */}
      {isNewStreet && (
        <div className="flex items-center space-x-2 text-xs">
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>Nouveau quartier</span>
          </Badge>
          <span className="text-gray-500">Sera ajouté aux suggestions</span>
        </div>
      )}
      
      {/* Informations contextuelles */}
      {selectedCity && totalStreets > 0 && (
        <p className="text-xs text-gray-500 flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>{totalStreets} quartier{totalStreets > 1 ? 's' : ''} disponible{totalStreets > 1 ? 's' : ''} dans {selectedCity}</span>
        </p>
      )}
      
      {selectedCity && totalStreets === 0 && !selectedStreet && (
        <p className="text-xs text-orange-600 flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>Aucun quartier enregistré pour {selectedCity}. Utilisez la recherche ci-dessus.</span>
        </p>
      )}
      
      {!selectedProvince && (
        <p className="text-xs text-gray-500 flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>Sélectionnez une province et une ville pour voir les quartiers</span>
        </p>
      )}
    </div>
  )
}