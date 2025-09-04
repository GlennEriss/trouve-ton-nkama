'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocationHierarchy } from '@/hooks/use-location-hierarchy'
import { Province } from '@/models/province'
import { City } from '@/models/city'
import { Street } from '@/models/street'

export default function LocationExample() {
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>()
  const [selectedCityId, setSelectedCityId] = useState<string>()
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [selectedStreet, setSelectedStreet] = useState<Street | null>(null)

  const {
    provinces,
    cities,
    streets,
    isLoading,
    isError,
    error,
    refetchProvinces,
    refetchCities,
    refetchStreets
  } = useLocationHierarchy(selectedProvinceId, selectedCityId)

  const handleProvinceSelect = (provinceId: string) => {
    setSelectedProvinceId(provinceId)
    setSelectedCityId(undefined) // Reset city selection
    const province = provinces.find(p => p.id === provinceId)
    setSelectedProvince(province || null)
    setSelectedCity(null)
    setSelectedStreet(null)
  }

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId)
    const city = cities.find(c => c.id === cityId)
    setSelectedCity(city || null)
    setSelectedStreet(null)
  }

  const handleStreetSelect = (streetId: string) => {
    const street = streets.find(s => s.id === streetId)
    setSelectedStreet(street || null)
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exemple d'utilisation de la hiérarchie de localisation</span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchProvinces()}
                disabled={isLoading}
              >
                Actualiser provinces
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchCities()}
                disabled={isLoading || !selectedProvinceId}
              >
                Actualiser villes
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchStreets()}
                disabled={isLoading || !selectedCityId}
              >
                Actualiser rues
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provinces */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Provinces ({provinces.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {provinces.map((province) => (
                <Button
                  key={province.id}
                  variant={selectedProvinceId === province.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleProvinceSelect(province.id)}
                  className="justify-start"
                >
                  <div className="flex items-center space-x-2">
                    <span>{province.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {province.country}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Cities */}
          {selectedProvinceId && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Villes de {selectedProvince?.name} ({cities.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cities.map((city) => (
                  <Button
                    key={city.id}
                    variant={selectedCityId === city.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCitySelect(city.id)}
                    className="justify-start"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{city.name}</span>
                      {city.provinceName && (
                        <Badge variant="outline" className="text-xs">
                          {city.provinceName}
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Streets */}
          {selectedCityId && (
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Rues de {selectedCity?.name} ({streets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {streets.map((street) => (
                  <Button
                    key={street.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStreetSelect(street.id)}
                    className="justify-start"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{street.name}</span>
                      {street.cityName && (
                        <Badge variant="outline" className="text-xs">
                          {street.cityName}
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          {(selectedProvince || selectedCity || selectedStreet) && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Sélection actuelle :</h3>
              <div className="space-y-2">
                {selectedProvince && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-blue-600">
                      Province
                    </Badge>
                    <span className="text-blue-700">{selectedProvince.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {selectedProvince.country}
                    </Badge>
                  </div>
                )}
                {selectedCity && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-green-600">
                      Ville
                    </Badge>
                    <span className="text-green-700">{selectedCity.name}</span>
                    {selectedCity.provinceName && (
                      <Badge variant="outline" className="text-xs">
                        {selectedCity.provinceName}
                      </Badge>
                    )}
                  </div>
                )}
                {selectedStreet && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-purple-600">
                      Rue
                    </Badge>
                    <span className="text-purple-700">{selectedStreet.name}</span>
                    {selectedStreet.cityName && (
                      <Badge variant="outline" className="text-xs">
                        {selectedStreet.cityName}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {isError && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold mb-2 text-red-800">Erreur :</h3>
              <p className="text-red-700">{error?.message}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold mb-2 text-yellow-800">Chargement...</h3>
              <p className="text-yellow-700">Récupération des données de localisation</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
