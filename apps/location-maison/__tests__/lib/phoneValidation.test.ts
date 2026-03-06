import { 
  validatePhoneNumberForSupportedCountries, 
  formatPhoneNumberForDisplay, 
  normalizePhoneNumberForFirebase,
  SUPPORTED_COUNTRIES,
  GABON_NEW_NUMBERING_INFO
} from '@/lib/phoneValidation';

describe('Phone Validation Tests', () => {
  describe('Gabon Phone Numbers', () => {
    // Nouveaux préfixes (2024)
    test('should validate new Gabon numbers with 06 prefix', () => {
      const validNumbers = [
        '+24106123456',
        '24106123456',
        '06123456',
        '6123456'
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('GA');
        expect(result.message).toContain('Gabon');
      });
    });

    test('should validate new Gabon numbers with 07 prefix', () => {
      const validNumbers = [
        '+24107123456',
        '24107123456',
        '07123456',
        '7123456'
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('GA');
      });
    });

    // Anciens préfixes (compatibilité)
    test('should validate old Gabon numbers for compatibility', () => {
      const validNumbers = [
        '+24101234567',
        '24101234567',
        '01234567',
        '1234567'
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('GA');
      });
    });

    test('should reject invalid Gabon numbers', () => {
      const invalidNumbers = [
        '+24108123456', // Préfixe 08 non supporté
        '+2410612345',  // Trop court
        '+241061234567', // Trop long
        '+24206123456',  // Mauvais code pays
        'invalid',
        ''
      ];

      invalidNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Senegal Phone Numbers', () => {
    test('should validate Senegal numbers', () => {
      const validNumbers = [
        '+221701234567',
        '221701234567',
        '701234567'
      ];

      validNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('SN');
      });
    });

    test('should reject invalid Senegal numbers', () => {
      const invalidNumbers = [
        '+221601234567', // Préfixe 60 non supporté
        '+22170123456',  // Trop court
        '+2217012345678', // Trop long
        '+241701234567',  // Mauvais code pays
      ];

      invalidNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Phone Number Formatting', () => {
    test('should format Gabon numbers correctly', () => {
      const testCases = [
        { input: '+24106123456', expected: '+241 06 12 34 56' },
        { input: '24106123456', expected: '+241 06 12 34 56' },
        { input: '06123456', expected: '+241 06 12 34 56' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatPhoneNumberForDisplay(input);
        expect(result).toBe(expected);
      });
    });

    test('should format Senegal numbers correctly', () => {
      const testCases = [
        { input: '+221701234567', expected: '+221 70 123 45 67' },
        { input: '221701234567', expected: '+221 70 123 45 67' },
        { input: '701234567', expected: '+221 70 123 45 67' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = formatPhoneNumberForDisplay(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Firebase Normalization', () => {
    test('should normalize Gabon numbers for Firebase', () => {
      const testCases = [
        { input: '06123456', expected: '+24106123456' },
        { input: '+24106123456', expected: '+24106123456' },
        { input: '24106123456', expected: '+24106123456' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePhoneNumberForFirebase(input);
        expect(result).toBe(expected);
      });
    });

    test('should normalize Senegal numbers for Firebase', () => {
      const testCases = [
        { input: '701234567', expected: '+221701234567' },
        { input: '+221701234567', expected: '+221701234567' },
        { input: '221701234567', expected: '+221701234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizePhoneNumberForFirebase(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Configuration', () => {
    test('should have correct Gabon configuration', () => {
      const gabonConfig = SUPPORTED_COUNTRIES.GA;
      
      expect(gabonConfig.name).toBe('Gabon');
      expect(gabonConfig.code).toBe('GA');
      expect(gabonConfig.countryCode).toBe('+241');
      expect(gabonConfig.validPrefixes).toContain('06');
      expect(gabonConfig.validPrefixes).toContain('07');
      expect(gabonConfig.length).toBe(8);
    });

    test('should have correct Senegal configuration', () => {
      const senegalConfig = SUPPORTED_COUNTRIES.SN;
      
      expect(senegalConfig.name).toBe('Sénégal');
      expect(senegalConfig.code).toBe('SN');
      expect(senegalConfig.countryCode).toBe('+221');
      expect(senegalConfig.validPrefixes).toContain('70');
      expect(senegalConfig.length).toBe(9);
    });

    test('should have correct new numbering info', () => {
      expect(GABON_NEW_NUMBERING_INFO.implementationDate).toBe('2024');
      expect(GABON_NEW_NUMBERING_INFO.newPrefixes).toContain('06');
      expect(GABON_NEW_NUMBERING_INFO.newPrefixes).toContain('07');
      expect(GABON_NEW_NUMBERING_INFO.oldPrefixes).toContain('01');
      expect(GABON_NEW_NUMBERING_INFO.oldPrefixes).toContain('09');
    });
  });

  describe('Error Messages', () => {
    test('should provide appropriate error messages', () => {
      const emptyResult = validatePhoneNumberForSupportedCountries('');
      expect(emptyResult.message).toBe('Le numéro de téléphone est obligatoire');

      const invalidResult = validatePhoneNumberForSupportedCountries('invalid');
      expect(invalidResult.message).toContain('Numéro invalide');
    });

    test('should provide country-specific error messages', () => {
      const gabonInvalid = validatePhoneNumberForSupportedCountries('+24108123456');
      expect(gabonInvalid.message).toContain('gabonais');

      const senegalInvalid = validatePhoneNumberForSupportedCountries('+22160123456');
      expect(senegalInvalid.message).toContain('sénégalais');
    });
  });

  describe('Edge Cases', () => {
    test('should handle whitespace and special characters', () => {
      const dirtyNumbers = [
        '+241 06 12 34 56',
        '+241-06-12-34-56',
        '(241) 06 12 34 56',
        '  +24106123456  '
      ];

      dirtyNumbers.forEach(number => {
        const result = validatePhoneNumberForSupportedCountries(number);
        expect(result.isValid).toBe(true);
        expect(result.country).toBe('GA');
      });
    });

    test('should handle null and undefined', () => {
      const nullResult = validatePhoneNumberForSupportedCountries(null as any);
      expect(nullResult.isValid).toBe(false);

      const undefinedResult = validatePhoneNumberForSupportedCountries(undefined as any);
      expect(undefinedResult.isValid).toBe(false);
    });
  });
}); 
