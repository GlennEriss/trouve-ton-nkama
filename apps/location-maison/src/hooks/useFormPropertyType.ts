import { usePathname } from 'next/navigation'
import { TypeProperty, Property } from '@/models/annonce'

/**
 * Hook pour déterminer le type de propriété basé sur l'URL ou les données existantes
 * Spécifiquement pour les formulaires de propriété
 */
export function useFormPropertyType(propertyToUpdated?: Partial<Property>) {
  // Hook pour les formulaires de propriété
  const pathname = usePathname()

  const getTypeProperty = (): TypeProperty => {
    const pathnames = pathname.split('/')
    const type = pathnames[pathnames.length - 1]
    
    switch (type) {
      case 'apartment':
        return 'Apartment' as TypeProperty
      case 'building':
        return 'Building' as TypeProperty
      case 'desk':
        return 'Desk' as TypeProperty
      case 'home':
        return 'Home' as TypeProperty
      case 'studio':
        return 'Studio' as TypeProperty
      case 'shop':
        return 'Shop' as TypeProperty
      case 'kiosk':
        return 'Kiosk' as TypeProperty
      case 'room':
        return 'Room' as TypeProperty
      case 'land':
        return 'Land' as TypeProperty
      case 'villa':
        return 'Villa' as TypeProperty
      case 'duplex':
        return 'Duplex' as TypeProperty
      case 'warehouse':
        return 'Warehouse' as TypeProperty
      default:
        return 'Property' as TypeProperty
    }
  }

  // Retourner le type de propriété existant ou déterminer à partir de l'URL
  const typeProperty = propertyToUpdated 
    ? (propertyToUpdated.typeProperty as TypeProperty) 
    : getTypeProperty()

  return {
    typeProperty,
    getTypeProperty
  }
}
