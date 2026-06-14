'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useFormContext } from 'react-hook-form'
import { MapPin, Crosshair, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useStep3FormPropertyMediator } from '@/hooks/useStep3FormPropertyMediator'
import { useGooglePlaces, ResolvedPlace } from '@/hooks/google-map/use-google-places'
import { GABON_PROVINCES, getProvinceByName } from '@/constantes/gabon-locations'
import { createLogger } from '@/lib/logger'
import PlacesAutocompleteInput from './PlacesAutocompleteInput'

const logger = createLogger('components.location.picker')

const GoogleLocationMap = dynamic(() => import('./GoogleLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="h-56 bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
})

export default function LocationPicker() {
  const { watch, formState: { errors } } = useFormContext<any>()
  const mediator = useStep3FormPropertyMediator()
  const { reverseGeocode } = useGooglePlaces()
  const { toast } = useToast()
  const [gpsLoading, setGpsLoading] = useState(false)

  const province = watch('address.province') || ''
  const city = watch('address.city') || ''
  const district = watch('address.district') || ''

  // Coordonnées de la carte : quartier > ville > province > position principale.
  const streetLat = watch('streetLat')
  const streetLon = watch('streetLon')
  const cityLat = watch('cityLat')
  const cityLon = watch('cityLon')
  const provinceLat = watch('provinceLat')
  const provinceLon = watch('provinceLon')
  const latitude = watch('latitude')
  const longitude = watch('longitude')

  const pickCoords = (): { lat: number; lng: number } | null => {
    if (streetLat && streetLon) return { lat: streetLat, lng: streetLon }
    if (cityLat && cityLon) return { lat: cityLat, lng: cityLon }
    if (provinceLat && provinceLon) return { lat: provinceLat, lng: provinceLon }
    if (latitude && longitude) return { lat: latitude, lng: longitude }
    return null
  }
  const mapCoords = pickCoords()

  const provinceCenter = getProvinceByName(province)
  const cityBias = cityLat && cityLon ? { lat: cityLat, lng: cityLon } : provinceCenter ?? null

  /** Sélection d'une province (liste fixe des 9 provinces). */
  const handleProvinceChange = (name: string) => {
    const prov = getProvinceByName(name)
    mediator.setProvince(name)
    // Réinitialise ville et quartier qui dépendent de la province.
    mediator.setCity('')
    mediator.setDistrict('')
    mediator.setCityCoordinates({ lon: 0, lat: 0 })
    mediator.setStreetCoordinates({ lon: 0, lat: 0 })
    mediator.setIsLocExact(false)
    if (prov) {
      mediator.setProvinceCoordinates({ lon: prov.lng, lat: prov.lat })
      mediator.setCoordinates({ lon: prov.lng, lat: prov.lat })
    }
  }

  /** Sélection d'une ville via Google Places. */
  const handleCitySelect = (place: ResolvedPlace) => {
    mediator.setCity(place.name)
    mediator.setCityCoordinates({ lon: place.lng, lat: place.lat })
    mediator.setCoordinates({ lon: place.lng, lat: place.lat })
    // Le quartier doit être re-choisi pour la nouvelle ville.
    mediator.setDistrict('')
    mediator.setStreetCoordinates({ lon: 0, lat: 0 })
    mediator.setIsLocExact(false)
    if (!province && place.province && getProvinceByName(place.province)) {
      handleProvinceFromText(place.province)
    }
  }

  /** Sélection d'un quartier via Google Places. */
  const handleDistrictSelect = (place: ResolvedPlace) => {
    mediator.setDistrict(place.name)
    mediator.setStreetCoordinates({ lon: place.lng, lat: place.lat })
    mediator.setCoordinates({ lon: place.lng, lat: place.lat })
    mediator.setIsLocExact(false)
    if (!city && place.city) {
      mediator.setCity(place.city)
      mediator.setCityCoordinates({ lon: place.lng, lat: place.lat })
    }
  }

  // Aligne une province retournée par Google sur l'un des 9 noms officiels
  // (sinon conserve la valeur brute pour ne pas laisser le champ vide).
  const handleProvinceFromText = (name: string) => {
    const match = GABON_PROVINCES.find((p) =>
      name.toLowerCase().includes(p.name.toLowerCase()),
    )
    mediator.setProvince(match ? match.name : name)
  }

  /** Localisation GPS exacte du bien. */
  const handleGPSLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Géolocalisation non supportée',
        description: 'Votre navigateur ne supporte pas la géolocalisation. Utilisez les listes ci-dessous.',
        variant: 'destructive',
      })
      return
    }

    setGpsLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const { latitude: lat, longitude: lng } = position.coords
      const result = await reverseGeocode(lat, lng)

      if (!result || (result as any).isGabon === false) {
        toast({
          title: 'Position hors du Gabon',
          description: "Votre position ne semble pas être au Gabon. Utilisez les listes Province / Ville / Quartier.",
          variant: 'destructive',
        })
        return
      }

      if (result.province) handleProvinceFromText(result.province)
      mediator.setCity(result.city || '')
      mediator.setDistrict(result.district || result.name || '')

      mediator.setCoordinates({ lon: lng, lat })
      mediator.setProvinceCoordinates({ lon: lng, lat })
      mediator.setCityCoordinates({ lon: lng, lat })
      mediator.setStreetCoordinates({ lon: lng, lat })
      mediator.setIsLocExact(true)

      toast({
        title: 'Localisation détectée',
        description: 'Votre position a été utilisée pour remplir automatiquement les champs.',
        variant: 'success',
      })
    } catch (error: any) {
      logger.error('GPS retrieval failed', { code: error?.code, message: error?.message })
      let title = 'Erreur GPS'
      let description = "Impossible d'obtenir votre position. Utilisez les listes ci-dessous."
      if (error?.code === 1) {
        title = 'Position bloquée'
        description =
          "Vérifiez l'autorisation du site, mais aussi les Services de localisation de votre système (macOS : Réglages → Confidentialité → Service de localisation) et que la page est bien en https ou localhost."
      } else if (error?.code === 2) {
        title = 'Position non disponible'
        description = 'Votre position GPS est indisponible actuellement. Utilisez les listes ci-dessous.'
      } else if (error?.code === 3) {
        title = 'Délai dépassé'
        description = 'La récupération de votre position a pris trop de temps. Réessayez.'
      }
      toast({ title, description, variant: 'destructive' })
    } finally {
      setGpsLoading(false)
    }
  }

  const districtError = (errors?.address as any)?.district?.message as string | undefined

  return (
    <div className="space-y-6 w-full">
      {/* En-tête */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <MapPin className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-lg">Localisation du bien</span>
        </div>
        <p className="text-[#224D62]/80 text-sm font-medium">
          Utilisez votre position actuelle, ou renseignez la province, la ville et le quartier.
        </p>
      </div>

      {/* Option 1 : position GPS exacte */}
      <div className="text-center bg-gradient-to-r from-[#156B68]/10 to-[#156B68]/5 rounded-xl p-5 border border-[#156B68]/20">
        <p className="text-[#224D62]/80 text-sm font-medium mb-3 flex items-center justify-center">
          <MapPin className="w-4 h-4 mr-2" />
          Vous êtes sur place ? Remplissez tout automatiquement.
        </p>
        <Button
          type="button"
          size="lg"
          onClick={handleGPSLocation}
          disabled={gpsLoading}
          className="bg-[#156B68] hover:bg-[#156B68]/90 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all border-0"
        >
          {gpsLoading ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5 mr-3" />
          )}
          Utiliser ma position actuelle
        </Button>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#224D62]/15" />
        <span className="text-xs font-medium text-[#224D62]/60 uppercase tracking-wide">ou</span>
        <div className="flex-1 h-px bg-[#224D62]/15" />
      </div>

      {/* Option 2 : sélection manuelle */}
      <div className="space-y-4">
        {/* Province */}
        <div className="space-y-2">
          <Label className="text-md">
            Province <span className="text-red-500">*</span>
          </Label>
          <Select value={province || undefined} onValueChange={handleProvinceChange}>
            <SelectTrigger className="w-full rounded-full py-6 text-md bg-gray-50 dark:bg-gray-900 dark:text-white border-[#1FA89B] focus:ring-0 focus:border-[#1FA89B] focus:bg-[#ebf6f5] transition-colors">
              <SelectValue placeholder="Choisissez votre province" />
            </SelectTrigger>
            <SelectContent>
              {GABON_PROVINCES.map((p) => (
                <SelectItem key={p.name} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ville */}
        <div className="space-y-2">
          <Label className="text-md">
            Ville <span className="text-red-500">*</span>
          </Label>
          <PlacesAutocompleteInput
            value={city}
            onSelect={handleCitySelect}
            onClear={() => mediator.setCity('')}
            placeholder="Ex: Libreville, Port-Gentil…"
            bias={provinceCenter ?? null}
          />
        </div>

        {/* Quartier */}
        <div className="space-y-2">
          <Label className="text-md">
            Quartier <span className="text-red-500">*</span>
          </Label>
          <PlacesAutocompleteInput
            value={district}
            onSelect={handleDistrictSelect}
            onClear={() => mediator.setDistrict('')}
            placeholder="Ex: Glass, Akanda, Lalala…"
            bias={cityBias}
            hasError={!!districtError}
          />
          {districtError && <p className="text-red-500 text-xs">{districtError}</p>}
        </div>
      </div>

      {/* Carte */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-2xl p-3 shadow-lg border border-[#224D62]/20">
        <GoogleLocationMap coordinates={mapCoords} label={district || city || province} />
      </div>
    </div>
  )
}
