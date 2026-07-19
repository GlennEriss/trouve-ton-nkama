import { useCurrentUser } from './use-current-user'
import { createFile } from '@/db/file.db'
import { createProvince } from '@/db/province.db'
import { createCity } from '@/db/city.db'
import { createStreet } from '@/db/street.db'
import { Property, Image } from '@/models/annonce'
import { createLogger } from '@/lib/logger'

const logger = createLogger('hooks.use-on-submit-form-property')

/**
 * Hook pour gérer la logique de soumission du formulaire de propriété
 */
export function useOnSubmitFormProperty(
  property: Property,
  imagesAlreadyUpload: Image[],
  isUpdate: boolean = false,
  onClearStorage?: () => void
) {
  const { user } = useCurrentUser()

  const onSubmit = async (data: any) => {
    // Séparer les images déjà uploadées (string) des nouvelles (File/Blob)
    const imgStringList = data.images.filter((img: File | Blob | string | undefined) => 
      typeof img === "string"
    )
    const imgUploads = imagesAlreadyUpload.filter(img => 
      imgStringList.includes(img.fileURL)
    )

    // Créer les nouvelles images
    const filesUpload = data.images.filter((img: File | Blob | string | undefined) =>
      img instanceof File || img instanceof Blob
    ) as (File | Blob)[]

    const promiseFiles = filesUpload.map(async (img: File | Blob, index) => {
      const file = img instanceof File ? img : new File([img], `image_${index}.jpeg`, {
        type: img.type || 'image/jpeg',
        lastModified: Date.now(),
      })
      return await createFile(file, user?.uid, 'property')
    })
    
    const images = await Promise.all(promiseFiles)

    // Nettoyer les données en retirant les coordonnées de localisation
    const { 
      provinceLon, 
      provinceLat, 
      cityLon, 
      cityLat, 
      streetLon, 
      streetLat, 
      ...othersData 
    } = data
    
    // Retirer longitude et latitude si leurs valeurs sont à 0
    let finalData = { ...othersData }
    if (data.longitude === 0 && data.latitude === 0) {
      const { longitude, latitude, ...dataWithoutCoords } = finalData
      finalData = dataWithoutCoords
    }
    
    // S'assurer que isLocExact est présent (par défaut false si non défini)
    if (finalData.isLocExact === undefined) {
      finalData.isLocExact = false
    }
    
    // Créer l'objet propriété final
    const propertyMutate: Property = {
      ...property,
      ...finalData,
      images: [...images, ...imgUploads],
      createdBy: user?.uid
    }

    if (data.longitude === 0 && data.latitude === 0) {
      delete (propertyMutate as Partial<Property>).longitude
      delete (propertyMutate as Partial<Property>).latitude
    }

    // Créer les entités de localisation
    await createLocationEntities(propertyMutate, {
      provinceLon,
      provinceLat,
      cityLon,
      cityLat,
      streetLon,
      streetLat
    })

    // Nettoyer le localStorage si ce n'est pas une mise à jour
    if (!isUpdate) {
      onClearStorage?.()
    }

    return propertyMutate
  }

  return {
    onSubmit
  }
}

// Fonction utilitaire pour créer les entités de localisation
async function createLocationEntities(
  property: Property, 
  coordinates: {
    provinceLon: number | null
    provinceLat: number | null
    cityLon: number | null
    cityLat: number | null
    streetLon: number | null
    streetLat: number | null
  }
) {
  // Créer la province
  let provinceId: string | null = null
  try {
    provinceId = await createProvince({
      name: property.province,
      country: property.country,
      countryCode: property.countryCode,
      longitude: coordinates.provinceLon ?? undefined,
      latitude: coordinates.provinceLat ?? undefined
    })
  } catch (error) {
    logger.warn('Failed to create province', { error, province: property.province })
  }
  
  // Créer la ville
  let cityId: string | null = null
  try {
    cityId = await createCity({
      name: property.city,
      provinceId: provinceId || null,
      provinceName: property.province,
      country: property.country,
      countryCode: property.countryCode,
      longitude: coordinates.cityLon ?? undefined,
      latitude: coordinates.cityLat ?? undefined
    })
  } catch (error) {
    logger.warn('Failed to create city', { error, city: property.city })
  }
  
  // Créer la rue
  try {
    await createStreet({
      name: property.street,
      cityId: cityId || null,
      cityName: property.city,
      provinceId: provinceId || null,
      provinceName: property.province,
      country: property.country,
      countryCode: property.countryCode,
      longitude: coordinates.streetLon ?? undefined,
      latitude: coordinates.streetLat ?? undefined
    })
  } catch (error) {
    logger.warn('Failed to create street', { error, street: property.street })
  }
}
