/**
 * Validation des numéros de téléphone pour Gabon et Sénégal
 * Support de la nouvelle numérotation gabonaise (2024)
 */

// Configuration des pays supportés
export const SUPPORTED_COUNTRIES = {
  GA: {
    name: 'Gabon',
    code: 'GA',
    countryCode: '+241',
    patterns: [
      // Nouvelle numérotation gabonaise (2024)
      /^\+241[67]\d{7}$/, // Format international avec nouveau préfixe
      /^241[67]\d{7}$/, // Format sans + avec nouveau préfixe
      /^0[67]\d{7}$/, // Format local avec nouveau préfixe
      /^[67]\d{7}$/, // Format sans préfixe avec nouveau préfixe
      
      // Ancienne numérotation (pour compatibilité)
      /^\+2410[1-9]\d{6}$/, // Format international ancien
      /^2410[1-9]\d{6}$/, // Format sans + ancien
      /^00[1-9]\d{6}$/, // Format local ancien
      /^0[1-9]\d{6}$/, // Format sans préfixe ancien
    ],
    validPrefixes: ['06', '07'], // Nouveaux préfixes
    oldPrefixes: ['01', '02', '03', '04', '05', '06', '07', '08', '09'], // Anciens préfixes
    length: 8, // Longueur sans le code pays
    message: 'Numéro de téléphone gabonais invalide. Format attendu: +241 06 12 34 56'
  },
  SN: {
    name: 'Sénégal',
    code: 'SN',
    countryCode: '+221',
    patterns: [
      /^\+221[67]\d{7}$/, // Format international
      /^221[67]\d{7}$/, // Format sans +
      /^[67]\d{7}$/, // Format local
    ],
    validPrefixes: ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'],
    length: 9, // Longueur sans le code pays
    message: 'Numéro de téléphone sénégalais invalide. Format attendu: +221 70 123 45 67'
  }
} as const;

export type SupportedCountry = keyof typeof SUPPORTED_COUNTRIES;

// Configuration globale (peut être modifiée via variable d'environnement)
const ENABLED_COUNTRIES: SupportedCountry[] = process.env.NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES 
  ? (process.env.NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES.split(',') as SupportedCountry[])
  : ['GA']; // Par défaut, seulement Gabon

/**
 * Nettoie un numéro de téléphone
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, '');
}

/**
 * Vérifie si un numéro appartient à un pays supporté
 */
function getCountryFromNumber(phone: string): SupportedCountry | null {
  const cleanPhone = cleanPhoneNumber(phone);
  
  for (const [countryCode, config] of Object.entries(SUPPORTED_COUNTRIES)) {
    if (ENABLED_COUNTRIES.includes(countryCode as SupportedCountry)) {
      for (const pattern of config.patterns) {
        if (pattern.test(cleanPhone)) {
          return countryCode as SupportedCountry;
        }
      }
    }
  }
  
  return null;
}

/**
 * Valide un numéro de téléphone pour les pays supportés
 */
export function validatePhoneNumberForSupportedCountries(phone: string): {
  isValid: boolean;
  country: SupportedCountry | null;
  message: string;
} {
  if (!phone) {
    return {
      isValid: false,
      country: null,
      message: 'Le numéro de téléphone est obligatoire'
    };
  }

  const cleanPhone = cleanPhoneNumber(phone);
  
  // Vérifier d'abord si c'est un numéro gabonais (code pays +241)
  // Accepter les formats: +241XXXXXXXX, 241XXXXXXXX, 0XXXXXXXX, ou XXXXXXXX
  let localNumber = cleanPhone;
  let detectedCountry: SupportedCountry | null = null;
  
  // Si le numéro commence par 241 (avec ou sans +)
  if (cleanPhone.startsWith('241')) {
    localNumber = cleanPhone.substring(3); // Enlever le code pays
    detectedCountry = 'GA';
  } else if (cleanPhone.startsWith('221')) {
    localNumber = cleanPhone.substring(3);
    detectedCountry = 'SN';
  } else if (cleanPhone.startsWith('0')) {
    // Format local avec 0 initial (Gabon ou Sénégal)
    // Pour le Gabon, garder le 0 si le numéro a 9 chiffres, sinon l'enlever
    // Exemples: 066893836 (9 chiffres) -> garder, 06893836 (8 chiffres) -> enlever le 0
    if (cleanPhone.length === 9 && ENABLED_COUNTRIES.includes('GA')) {
      // Format avec 0 initial et 9 chiffres: garder tel quel
      localNumber = cleanPhone;
      detectedCountry = 'GA';
    } else {
      // Format avec 0 initial et 8 chiffres ou moins: enlever le 0
      localNumber = cleanPhone.substring(1);
      detectedCountry = ENABLED_COUNTRIES.includes('GA') ? 'GA' : (ENABLED_COUNTRIES[0] || null);
    }
  } else {
    // Format sans préfixe, utiliser le pays par défaut
    localNumber = cleanPhone;
    detectedCountry = ENABLED_COUNTRIES[0] || null;
  }
  
  // Validation simplifiée : accepter 8 à 9 chiffres pour le Gabon
  if (detectedCountry === 'GA') {
    // Accepter entre 8 et 9 chiffres pour le numéro local
    // Formats acceptés: 
    // - +241066893836 -> 066893836 (9 chiffres) ✅
    // - +24106893836 -> 06893836 (8 chiffres) ✅
    // - +24166893836 -> 66893836 (8 chiffres) ✅
    // - 066893836 -> 066893836 (9 chiffres) ✅
    // - 06893836 -> 6893836 (7 chiffres après enlèvement du 0) -> vérifier avec 0
    // - 66893836 -> 66893836 (8 chiffres) ✅
    
    // Vérifier que le numéro local a entre 8 et 9 chiffres
    if (localNumber.length >= 8 && localNumber.length <= 9 && /^\d+$/.test(localNumber)) {
      return {
        isValid: true,
        country: 'GA',
        message: 'Numéro Gabon valide'
      };
    }
    // Si le numéro a 7 chiffres et commence par 0, vérifier avec le 0
    if (localNumber.length === 7 && cleanPhone.startsWith('0') && cleanPhone.length === 8) {
      // Format: 06893836 (8 chiffres avec 0 initial)
      if (/^\d+$/.test(cleanPhone)) {
        return {
          isValid: true,
          country: 'GA',
          message: 'Numéro Gabon valide'
        };
      }
    }
  } else if (detectedCountry === 'SN') {
    // Pour le Sénégal, garder la validation existante
    const country = getCountryFromNumber(cleanPhone);
    if (country === 'SN') {
      const config = SUPPORTED_COUNTRIES[country];
      for (const pattern of config.patterns) {
        if (pattern.test(cleanPhone)) {
          return {
            isValid: true,
            country: 'SN',
            message: 'Numéro Sénégal valide'
          };
        }
      }
    }
  }
  
  // Si aucun pays détecté ou validation échouée
  const enabledCountriesList = ENABLED_COUNTRIES.map(code => SUPPORTED_COUNTRIES[code].name).join(' ou ');
  return {
    isValid: false,
    country: detectedCountry,
    message: `Numéro invalide. Seuls les numéros ${enabledCountriesList} sont acceptés.`
  };
}

/**
 * Formate un numéro de téléphone pour l'affichage
 */
export function formatPhoneNumberForDisplay(phone: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const country = getCountryFromNumber(phone);
  
  if (!country) return phone;
  
  const config = SUPPORTED_COUNTRIES[country];
  
  // Retirer le code pays pour le formatage local
  let localNumber = cleanPhone;
  if (cleanPhone.startsWith('241')) {
    localNumber = cleanPhone.substring(3);
  } else if (cleanPhone.startsWith('221')) {
    localNumber = cleanPhone.substring(3);
  }
  
  // Formater selon le pays
  if (country === 'GA') {
    // Format gabonais: 06 12 34 56
    if (localNumber.length === 8) {
      return `${config.countryCode} ${localNumber.substring(0, 2)} ${localNumber.substring(2, 4)} ${localNumber.substring(4, 6)} ${localNumber.substring(6)}`;
    }
  } else if (country === 'SN') {
    // Format sénégalais: 70 123 45 67
    if (localNumber.length === 9) {
      return `${config.countryCode} ${localNumber.substring(0, 2)} ${localNumber.substring(2, 5)} ${localNumber.substring(5, 7)} ${localNumber.substring(7)}`;
    }
  }
  
  return phone;
}

/**
 * Normalise un numéro de téléphone pour Firebase
 */
export function normalizePhoneNumberForFirebase(phone: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const country = getCountryFromNumber(phone);
  
  if (!country) return phone;
  
  const config = SUPPORTED_COUNTRIES[country];
  
  // S'assurer que le numéro commence par le code pays
  if (!cleanPhone.startsWith('241') && !cleanPhone.startsWith('221')) {
    return `${config.countryCode}${cleanPhone}`;
  }
  
  return `+${cleanPhone}`;
}

/**
 * Obtient la liste des pays supportés actuellement
 */
export function getEnabledCountries(): Array<{code: SupportedCountry, name: string}> {
  return ENABLED_COUNTRIES.map(code => ({
    code,
    name: SUPPORTED_COUNTRIES[code].name
  }));
}

/**
 * Vérifie si un pays est activé
 */
export function isCountryEnabled(countryCode: string): boolean {
  return ENABLED_COUNTRIES.includes(countryCode as SupportedCountry);
}

/**
 * Active ou désactive un pays
 * Note: Cette fonction modifie la configuration en mémoire
 * Pour une configuration permanente, utilisez les variables d'environnement
 */
export function toggleCountry(countryCode: SupportedCountry, enabled: boolean): void {
  if (enabled && !ENABLED_COUNTRIES.includes(countryCode)) {
    ENABLED_COUNTRIES.push(countryCode);
  } else if (!enabled && ENABLED_COUNTRIES.includes(countryCode)) {
    const index = ENABLED_COUNTRIES.indexOf(countryCode);
    if (index > -1) {
      ENABLED_COUNTRIES.splice(index, 1);
    }
  }
}

// Informations sur la nouvelle numérotation gabonaise
export const GABON_NEW_NUMBERING_INFO = {
  implementationDate: '2024',
  newPrefixes: ['06', '07'],
  oldPrefixes: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
  description: 'Nouvelle numérotation gabonaise mise en place en 2024',
  migration: 'Les anciens numéros restent valides pendant la période de transition'
}; 