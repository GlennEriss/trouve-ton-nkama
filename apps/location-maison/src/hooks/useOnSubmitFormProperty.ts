import { useCurrentUser } from './use-current-user'
import { uploadPropertyImages } from '@/db/file.db'
import { Property, Image } from '@/models/annonce'

/**
 * Hook pour gérer la logique de soumission du formulaire de propriété
 *
 * La synchronisation des collections géographiques secondaires (`provinces`, `cities`,
 * `streets`) ne se fait plus ici : elle est déclenchée côté serveur, hors du chemin
 * critique de publication, par la Cloud Function `onPropertyLocationSync`
 * (functions/src/location/location-sync.trigger.ts) — voir
 * docs/performance-creation-modification-annonces-reels.md, point 1. Ce hook ne fait donc
 * plus que préparer l'objet `Property` à enregistrer ; c'est l'appelant (property.form.
 * provider.tsx) qui écrit réellement le document.
 *
 * Les six coordonnées techniques (`provinceLon/provinceLat/cityLon/cityLat/streetLon/
 * streetLat`) sont désormais CONSERVÉES dans le document (plus retirées comme
 * précédemment) : c'est ce qui permet au trigger de reproduire les documents géographiques
 * actuels. Elles décrivent des points de référence de la hiérarchie (province/ville/rue),
 * jamais la position exacte du bien (`longitude`/`latitude`, gérées séparément
 * ci-dessous).
 */
export function useOnSubmitFormProperty(
  property: Property,
  imagesAlreadyUpload: Image[],
  isUpdate: boolean = false,
  onClearStorage?: () => void
) {
  const { user } = useCurrentUser()

  /**
   * @param preUploadedImages Images déjà uploadées par l'appelant. Les parcours qui débitent un
   * crédit avant d'appeler ce hook (création assistée par IA) doivent uploader en amont : sinon un
   * upload qui échoue laisse l'annonceur facturé sans annonce. Quand ce paramètre est fourni,
   * aucun upload n'est refait ici.
   */
  const onSubmit = async (data: any, preUploadedImages?: Image[]) => {
    // Séparer les images déjà uploadées (string) des nouvelles (File/Blob)
    const imgStringList = data.images.filter((img: File | Blob | string | undefined) =>
      typeof img === "string"
    )
    const imgUploads = imagesAlreadyUpload.filter(img =>
      imgStringList.includes(img.fileURL)
    )

    // Créer les nouvelles images. `.map` déclenche les uploads immédiatement, donc on ne
    // construit les promesses que si l'appelant n'a pas déjà fourni les images.
    let images: Image[]

    if (preUploadedImages) {
      images = preUploadedImages
    } else {
      const filesUpload = data.images.filter((img: File | Blob | string | undefined) =>
        img instanceof File || img instanceof Blob
      ) as (File | Blob)[]

      // Concurrence bornée (voir docs/performance-creation-modification-annonces-reels.md,
      // point 4) plutôt qu'un Promise.all qui lancerait tous les uploads instantanément.
      images = await uploadPropertyImages(filesUpload, user?.uid, 'property')
    }

    // Les six coordonnées techniques (provinceLon/provinceLat/cityLon/cityLat/streetLon/
    // streetLat) restent dans `data` et sont donc conservées dans le document final —
    // seules longitude/latitude (position exacte du bien) sont traitées séparément
    // ci-dessous.
    let finalData = { ...data }

    // Retirer longitude et latitude si leurs valeurs sont à 0
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
