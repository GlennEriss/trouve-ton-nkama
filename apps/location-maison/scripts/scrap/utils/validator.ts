/**
 * Utilitaires de validation des données
 */

import { BienJSON } from '../mappers';
import { Property, Location, Image } from '../types/annonce';
import { CONFIG } from '../config';

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Statistiques de validation
 */
export interface ValidationStats {
  total: number;
  valid: number;
  invalid: number;
  skipped: number;
  errorsByType: Record<string, number>;
}

/**
 * Valide une annonce JSON brute
 */
export function validateBienJSON(bien: BienJSON): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation des champs obligatoires
  CONFIG.REQUIRED_FIELDS.forEach(field => {
    if (!bien[field as keyof BienJSON]) {
      errors.push(`Champ obligatoire manquant: ${field}`);
    }
  });

  // Validation spécifique des champs
  if (bien.titre) {
    if (bien.titre.length < 10) {
      warnings.push('Titre très court (moins de 10 caractères)');
    }
    if (bien.titre.length > 200) {
      warnings.push('Titre très long (plus de 200 caractères)');
    }
  }

  if (bien.description) {
    if (bien.description.length < 20) {
      warnings.push('Description très courte (moins de 20 caractères)');
    }
    if (bien.description.length > 2000) {
      warnings.push('Description très longue (plus de 2000 caractères)');
    }
  }

  // Validation du prix
  if (bien.prix !== undefined) {
    if (bien.prix < CONFIG.MIN_PRICE) {
      errors.push(`Prix trop faible: ${bien.prix} (minimum: ${CONFIG.MIN_PRICE})`);
    }
    if (bien.prix > 1000000000) { // 1 milliard
      warnings.push('Prix très élevé (plus de 1 milliard)');
    }
  }

  // Validation de l'ID
  if (bien.id && !/^[a-zA-Z0-9_-]+$/.test(bien.id)) {
    errors.push('ID contient des caractères invalides');
  }

  // Validation des contacts
  if (bien.contacts && bien.contacts.length > 0) {
    bien.contacts.forEach((contact, index) => {
      if (!validatePhoneNumber(contact)) {
        warnings.push(`Contact ${index + 1} invalide: ${contact}`);
      }
    });
  } else {
    warnings.push('Aucun contact fourni');
  }

  // Validation des caractéristiques
  if (bien.caracteristiques) {
    const carac = bien.caracteristiques;
    
    if (carac.nombre_chambres < 0) {
      errors.push('Nombre de chambres négatif');
    }
    if (carac.nombre_chambres > 20) {
      warnings.push('Nombre de chambres très élevé (plus de 20)');
    }
    
    if (carac.nombre_salles_bain < 0) {
      errors.push('Nombre de salles de bain négatif');
    }
    
    if (carac.nombre_toilettes < 0) {
      errors.push('Nombre de toilettes négatif');
    }
    
    if (carac.superficie < 0) {
      errors.push('Superficie négative');
    }
    if (carac.superficie > 10000) {
      warnings.push('Superficie très élevée (plus de 10000 m²)');
    }
  }

  // Validation des images
  if (!bien.localPhotos || bien.localPhotos.length === 0) {
    warnings.push('Aucune image locale fournie');
  }

  // Validation de la localisation
  if (!bien.localisation) {
    errors.push('Localisation manquante');
  }

  // Validation des tags
  if (!bien.tags || bien.tags.length === 0) {
    warnings.push('Aucun tag fourni');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide une propriété mappée
 */
export function validateProperty(property: Property): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation des champs obligatoires
  if (!property.title) errors.push('Titre manquant');
  if (!property.description) errors.push('Description manquante');
  if (!property.typeProperty) errors.push("Type d'annonce manquant");
  if (!property.status) errors.push('Statut manquant');
  if (property.price === undefined || property.price === null) {
    errors.push('Prix manquant');
  }

  // Validation des images
  if (!property.images || property.images.length === 0) {
    warnings.push('Aucune image');
  } else {
    property.images.forEach((image, index) => {
      if (!image.fileURL) {
        errors.push(`Image ${index + 1}: URL manquante`);
      }
      if (!image.filePATH) {
        errors.push(`Image ${index + 1}: chemin manquant`);
      }
    });
  }

  // Validation de la localisation
  const locationValidation = validateLocation(property);
  if (!locationValidation.isValid) {
    errors.push(...locationValidation.errors);
    warnings.push(...locationValidation.warnings);
  }

  // Validation des propriétés spécifiques selon le type
  const typeValidation = validatePropertyByType(property);
  if (!typeValidation.isValid) {
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide les propriétés spécifiques selon le type
 */
function validatePropertyByType(property: Property): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (property.typeProperty) {
    case 'Home':
    case 'Villa':
      const home = property as any;
      if (home.nbrRooms === undefined) errors.push('Nombre de chambres manquant');
      if (home.nbrBathrooms === undefined) errors.push('Nombre de salles de bain manquant');
      if (home.nbrToilets === undefined) errors.push('Nombre de toilettes manquant');
      break;

    case 'Apartment':
    case 'Studio':
      const apartment = property as any;
      if (apartment.nbrRooms === undefined) errors.push('Nombre de chambres manquant');
      if (apartment.nbrFloorApartment === undefined) warnings.push('Étage non précisé');
      break;

    case 'Building':
      const building = property as any;
      if (building.nbrApartments === undefined) errors.push('Nombre d\'appartements manquant');
      if (building.nbrFloors === undefined) errors.push('Nombre d\'étages manquant');
      break;

    case 'Desk':
    case 'Shop':
      const desk = property as any;
      if (desk.nbrRooms === undefined) errors.push('Nombre de pièces manquant');
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide une localisation
 */
export function validateLocation(location: Location): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!location.city) errors.push('Ville manquante');
  if (!location.province) errors.push('Province manquante');
  if (!location.country) errors.push('Pays manquant');
  if (!location.countryCode) errors.push('Code pays manquant');

  if (location.longitude === undefined || location.longitude === null) {
    errors.push('Longitude manquante');
  } else if (location.longitude < -180 || location.longitude > 180) {
    errors.push('Longitude invalide');
  }

  if (location.latitude === undefined || location.latitude === null) {
    errors.push('Latitude manquante');
  } else if (location.latitude < -90 || location.latitude > 90) {
    errors.push('Latitude invalide');
  }

  if (!location.street) warnings.push('Rue non précisée');

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valide un numéro de téléphone gabonais
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Nettoie le numéro (supprime espaces, tirets, etc.)
  const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
  
  // Patterns pour les numéros gabonais
  const patterns = [
    /^0[67]\d{7}$/, // Format local (06xxxxxxx ou 07xxxxxxx)
    /^241[67]\d{7}$/, // Format international (+241)
    /^[67]\d{7}$/ // Format sans préfixe
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
}

/**
 * Valide une URL d'image
 */
export function validateImageURL(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

/**
 * Valide un lot d'annonces
 */
export function validateBatch(biens: BienJSON[]): ValidationStats {
  const stats: ValidationStats = {
    total: biens.length,
    valid: 0,
    invalid: 0,
    skipped: 0,
    errorsByType: {}
  };

  biens.forEach(bien => {
    const validation = validateBienJSON(bien);
    
    if (validation.isValid) {
      stats.valid++;
    } else {
      stats.invalid++;
      
      // Comptage des erreurs par type
      validation.errors.forEach(error => {
        const parts = error.split(':');
        const errorType = parts.length > 0 && parts[0] ? parts[0] : 'Erreur inconnue';
        if (errorType) {
          stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;
        }
      });
    }
  });

  return stats;
}

/**
 * Filtre les annonces valides
 */
export function filterValidBiens(biens: BienJSON[]): {
  valid: BienJSON[];
  invalid: BienJSON[];
  validationResults: Map<string, ValidationResult>;
} {
  const valid: BienJSON[] = [];
  const invalid: BienJSON[] = [];
  const validationResults = new Map<string, ValidationResult>();

  biens.forEach(bien => {
    const validation = validateBienJSON(bien);
    validationResults.set(bien.id, validation);

    if (validation.isValid) {
      valid.push(bien);
    } else {
      invalid.push(bien);
    }
  });

  return { valid, invalid, validationResults };
}

/**
 * Génère un rapport de validation
 */
export function generateValidationReport(stats: ValidationStats): string {
  const report = [
    '=== RAPPORT DE VALIDATION ===',
    `Total des annonces: ${stats.total}`,
    `Valides: ${stats.valid} (${((stats.valid / stats.total) * 100).toFixed(1)}%)`,
    `Invalides: ${stats.invalid} (${((stats.invalid / stats.total) * 100).toFixed(1)}%)`,
    `Ignorées: ${stats.skipped} (${((stats.skipped / stats.total) * 100).toFixed(1)}%)`,
    '',
    '=== ERREURS PAR TYPE ===',
    ...Object.entries(stats.errorsByType)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => `${type}: ${count} occurrences`)
  ];

  return report.join('\n');
} 