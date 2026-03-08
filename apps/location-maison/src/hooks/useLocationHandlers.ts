import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { PhotonResult } from "@/models/PhotonResult"
import { useStep3FormPropertyMediator } from "@/hooks/useStep3FormPropertyMediator"
import { reversePhoton } from "@/lib/photonUtils"
import { createLogger } from "@/lib/logger"

const logger = createLogger('hooks.use-location-handlers')

export function useLocationHandlers() {
  const mediator = useStep3FormPropertyMediator()
  const { toast } = useToast()
  
  // États gérés par le hook
  const [selectedLocation, setSelectedLocation] = useState<PhotonResult | null>(null)
  const [districtQuery, setDistrictQuery] = useState('')
  const [mapCoordinates, setMapCoordinates] = useState<[number, number] | null>(null)
  const [isEditingDistrict, setIsEditingDistrict] = useState(false)

  // Initialiser les états depuis le formulaire au montage du composant
  useEffect(() => {
    const district = mediator.getDistrict()
    const city = mediator.getCity()
    const province = mediator.getProvince()
    const coords = mediator.getCoordinates()
    
    // Si on a des données de localisation dans le formulaire, les restaurer
    if (district && city && province && coords.lon && coords.lat) {
      setDistrictQuery(district)
      setMapCoordinates([coords.lon, coords.lat])
      
      // Reconstituer l'objet PhotonResult pour selectedLocation
      const restoredLocation: PhotonResult = {
        properties: {
          name: district,
          city: city,
          state: province,
          country: "Gabon",
          osm_key: "place",
          osm_value: "district"
        },
        geometry: {
          coordinates: [coords.lon, coords.lat]
        }
      }
      setSelectedLocation(restoredLocation)
    }
  }, []) // Seulement au montage

  const handleLocationSelect = (result: PhotonResult) => {
    const { properties, geometry } = result
    
    setSelectedLocation(result)
    setDistrictQuery(properties.name)
    setMapCoordinates(geometry.coordinates)

    // Remplir automatiquement via médiateur
    mediator.setDistrict(properties.name)
    mediator.setCity(properties.city || properties.suburb || "")
    mediator.setProvince(properties.state || "")

    // Coordonnées principales du schéma
    const [lon, lat] = geometry.coordinates
    mediator.setCoordinates({ lon, lat })
    mediator.setIsLocExact(false)
    
    // Coordonnées par niveau
    mediator.setStreetCoordinates({ lon, lat })
    if (properties.city || properties.suburb) {
      mediator.setCityCoordinates({ lon, lat })
    }
    if (properties.state) {
      mediator.setProvinceCoordinates({ lon, lat })
    }
  }

  const handleGPSLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Géolocalisation non supportée",
        description: "Votre navigateur ne supporte pas la géolocalisation. Veuillez utiliser la recherche manuelle.",
        variant: "destructive"
      })
      return
    }

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

      try {
        const result = await reversePhoton(longitude, latitude)
        
        if (result && (result.properties.country === 'Gabon' || result.properties.country === 'GA')) {
          setSelectedLocation(result)
          setDistrictQuery(result.properties.name)

          // Remplir automatiquement via médiateur
          mediator.setDistrict(result.properties.name)
          mediator.setCity(result.properties.city || result.properties.suburb || "")
          mediator.setProvince(result.properties.state || "")
          
          // Coordonnées principales du schéma
          mediator.setCoordinates({ lon: longitude, lat: latitude })
          mediator.setIsLocExact(true)
          
          // Coordonnées par niveau via GPS
          mediator.setStreetCoordinates({ lon: longitude, lat: latitude })
          mediator.setCityCoordinates({ lon: longitude, lat: latitude })
          mediator.setProvinceCoordinates({ lon: longitude, lat: latitude })

          toast({
            title: "Localisation détectée",
            description: "Votre position GPS a été utilisée pour remplir automatiquement les champs.",
            variant: "success",
          })
        } else {
          toast({
            title: "Position hors du Gabon",
            description: "Votre position GPS ne semble pas être au Gabon. Veuillez utiliser la recherche manuelle.",
            variant: "destructive",
          })
        }
      } catch (reverseError) {
        logger.error('Failed to reverse geocode GPS position', { reverseError, longitude, latitude })
        toast({
          title: "Erreur de localisation",
          description: "Impossible de récupérer les informations de localisation. Veuillez utiliser la recherche manuelle.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      logger.error('GPS retrieval failed', { error })
      
      let title = "Erreur GPS"
      let description = "Impossible d'obtenir votre position GPS. Veuillez utiliser la recherche manuelle."
      
      if (error.code === 1) {
        title = "Autorisation de géolocalisation refusée"
        description = "Pour utiliser la localisation exacte, vous devez autoriser l'accès à votre position dans votre navigateur."
      } else if (error.code === 2) {
        title = "Position non disponible"
        description = "Votre position GPS n'est pas disponible actuellement. Veuillez utiliser la recherche manuelle."
      } else if (error.code === 3) {
        title = "Délai d'attente dépassé"
        description = "La récupération de votre position GPS a pris trop de temps. Veuillez réessayer ou utiliser la recherche manuelle."
      }
      toast({
        title,
        description,
        variant: "destructive",
      })
    }
  }

  // Handler pour gérer les changements de query (réinitialise la sélection si l'utilisateur tape à nouveau)
  const handleDistrictQueryChange = (value: string) => {
    setDistrictQuery(value)
    // Si l'utilisateur modifie le query après avoir sélectionné, on réinitialise la sélection
    if (selectedLocation && value !== selectedLocation.properties.name && !isEditingDistrict) {
      setSelectedLocation(null)
    }
  }

  // Handler pour activer l'édition du quartier
  const handleEnableDistrictEdit = () => {
    setIsEditingDistrict(true)
  }

  // Handler pour confirmer l'édition du quartier
  const handleConfirmDistrictEdit = () => {
    setIsEditingDistrict(false)
    // Mettre à jour le formulaire avec le nouveau nom
    if (selectedLocation && districtQuery) {
      mediator.setDistrict(districtQuery)
      // S'assurer que districtQuery garde la valeur confirmée
      // (pas besoin de modifier districtQuery, il garde déjà la bonne valeur)
    }
  }

  // Handler pour annuler l'édition du quartier
  const handleCancelDistrictEdit = () => {
    setIsEditingDistrict(false)
    // Restaurer le nom original
    if (selectedLocation) {
      setDistrictQuery(selectedLocation.properties.name)
    }
  }

  return { 
    handleLocationSelect, 
    handleGPSLocation,
    selectedLocation,
    districtQuery,
    setDistrictQuery: handleDistrictQueryChange,
    mapCoordinates,
    isEditingDistrict,
    handleEnableDistrictEdit,
    handleConfirmDistrictEdit,
    handleCancelDistrictEdit
  }
}
