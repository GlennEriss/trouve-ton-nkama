'use client'

import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Building2, Home } from 'lucide-react'
import { useLocationHierarchy } from '@/hooks/use-location-hierarchy'
import { Province } from '@/models/province'
import { City } from '@/models/city'
import { Street } from '@/models/street'

interface LocationHierarchySelectorProps {
  onProvinceChange?: (province: Province | null) => void
  onCityChange?: (city: City | null) => void
  onStreetChange?: (street: Street | null) => void
  selectedProvinceId?: string
  selectedCityId?: string
  selectedStreetId?: string
}

export default function LocationHierarchySelector({
  onProvinceChange,
  onCityChange,
  onStreetChange,
  selectedProvinceId,
  selectedCityId,
  selectedStreetId
}: LocationHierarchySelectorProps) {
  const [localProvinceId, setLocalProvinceId] = useState<string | undefined>(selectedProvinceId)
  const [localCityId, setLocalCityId] = useState<string | undefined>(selectedCityId)
  const [localStreetId, setLocalStreetId] = useState<string | undefined>(selectedStreetId)

  const {
    provinces,
    cities,
    streets,
    isLoading,
    isError,
    error
  } = useLocationHierarchy(localProvinceId, localCityId)

  const handleProvinceChange = (provinceId: string) => {
    setLocalProvinceId(provinceId)
    setLocalCityId(undefined) // Reset city when province changes
    setLocalStreetId(undefined) // Reset street when province changes
    
    const selectedProvince = provinces.find(p => p.id === provinceId)
    onProvinceChange?.(selectedProvince || null)
    onCityChange?.(null) // Reset city callback
    onStreetChange?.(null) // Reset street callback
  }

  const handleCityChange = (cityId: string) => {
    setLocalCityId(cityId)
    setLocalStreetId(undefined) // Reset street when city changes
    
    const selectedCity = cities.find(c => c.id === cityId)
    onCityChange?.(selectedCity || null)
    onStreetChange?.(null) // Reset street callback
  }

  const handleStreetChange = (streetId: string) => {
    setLocalStreetId(streetId)
    
    const selectedStreet = streets.find(s => s.id === streetId)
    onStreetChange?.(selectedStreet || null)
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Erreur lors du chargement des données de localisation</span>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-1">{error.message}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-[#224D62]" />
          <span className="text-[#224D62]">Sélection de localisation</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Province Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Province</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Select value={localProvinceId} onValueChange={handleProvinceChange}>
            <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62]">
              <SelectValue placeholder="Sélectionnez une province" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province.id} value={province.id}>
                  <div className="flex items-center space-x-2">
                    <span>{province.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {province.country}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
            <Home className="w-4 h-4" />
            <span>Ville</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Select 
            value={localCityId} 
            onValueChange={handleCityChange}
            disabled={!localProvinceId}
          >
            <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62]">
              <SelectValue placeholder={localProvinceId ? "Sélectionnez une ville" : "Sélectionnez d'abord une province"} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  <div className="flex items-center space-x-2">
                    <span>{city.name}</span>
                    {city.provinceName && (
                      <Badge variant="outline" className="text-xs">
                        {city.provinceName}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Street Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#224D62] flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Rue</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </Label>
          <Select 
            value={localStreetId} 
            onValueChange={handleStreetChange}
            disabled={!localCityId}
          >
            <SelectTrigger className="border-[#CBB171]/30 focus:border-[#224D62]">
              <SelectValue placeholder={localCityId ? "Sélectionnez une rue" : "Sélectionnez d'abord une ville"} />
            </SelectTrigger>
            <SelectContent>
              {streets.map((street) => (
                <SelectItem key={street.id} value={street.id}>
                  <div className="flex items-center space-x-2">
                    <span>{street.name}</span>
                    {street.cityName && (
                      <Badge variant="outline" className="text-xs">
                        {street.cityName}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selection Summary */}
        {(localProvinceId || localCityId || localStreetId) && (
          <div className="p-3 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20">
            <h4 className="text-sm font-medium text-[#224D62] mb-2">Sélection actuelle :</h4>
            <div className="space-y-1 text-xs text-[#224D62]/80">
              {localProvinceId && (
                <div className="flex items-center space-x-2">
                  <Building2 className="w-3 h-3" />
                  <span>Province : {provinces.find(p => p.id === localProvinceId)?.name}</span>
                </div>
              )}
              {localCityId && (
                <div className="flex items-center space-x-2">
                  <Home className="w-3 h-3" />
                  <span>Ville : {cities.find(c => c.id === localCityId)?.name}</span>
                </div>
              )}
              {localStreetId && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3 h-3" />
                  <span>Rue : {streets.find(s => s.id === localStreetId)?.name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
