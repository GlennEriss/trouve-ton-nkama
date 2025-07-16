import React from 'react';
import { render, screen } from '@testing-library/react';
import { PhoneInput } from '@/components/ui/phone-input';
import { getEnabledCountries, toggleCountry } from '@/lib/phoneValidation';

// Mock de react-phone-number-input
jest.mock('react-phone-number-input', () => ({
  __esModule: true,
  default: ({ countries, defaultCountry, ...props }: any) => (
    <div data-testid="phone-input">
      <div data-testid="countries">{countries?.join(',')}</div>
      <div data-testid="default-country">{defaultCountry}</div>
      <input {...props} />
    </div>
  ),
  getCountryCallingCode: jest.fn(() => '241'),
}));

// Mock des flags
jest.mock('react-phone-number-input/flags', () => ({
  GA: () => <div data-testid="flag-ga">🇬🇦</div>,
  SN: () => <div data-testid="flag-sn">🇸🇳</div>,
}));

describe('PhoneInput Component', () => {
  beforeEach(() => {
    // Réinitialiser la configuration par défaut (Gabon seulement)
    toggleCountry('SN', false);
    toggleCountry('GA', true);
  });

  test('should only show enabled countries', () => {
    render(<PhoneInput />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Vérifier que seuls les pays activés sont présents
    expect(countriesElement.textContent).toBe('GA');
    expect(defaultCountryElement.textContent).toBe('GA');
  });

  test('should show both countries when both are enabled', () => {
    // Activer le Sénégal
    toggleCountry('SN', true);
    
    render(<PhoneInput />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Vérifier que les deux pays sont présents
    expect(countriesElement.textContent).toBe('GA,SN');
    expect(defaultCountryElement.textContent).toBe('GA'); // Premier pays activé
  });

  test('should show Senegal as default when only Senegal is enabled', () => {
    // Désactiver Gabon et activer Sénégal
    toggleCountry('GA', false);
    toggleCountry('SN', true);
    
    render(<PhoneInput />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Vérifier que seul le Sénégal est présent
    expect(countriesElement.textContent).toBe('SN');
    expect(defaultCountryElement.textContent).toBe('SN');
  });

  test('should handle empty enabled countries gracefully', () => {
    // Désactiver tous les pays
    toggleCountry('GA', false);
    toggleCountry('SN', false);
    
    render(<PhoneInput />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Devrait revenir à Gabon par défaut
    expect(countriesElement.textContent).toBe('GA');
    expect(defaultCountryElement.textContent).toBe('GA');
  });

  test('should respect custom defaultCountry prop', () => {
    // Activer les deux pays
    toggleCountry('GA', true);
    toggleCountry('SN', true);
    
    render(<PhoneInput defaultCountry="SN" />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Vérifier que le pays par défaut personnalisé est respecté
    expect(countriesElement.textContent).toBe('GA,SN');
    expect(defaultCountryElement.textContent).toBe('SN');
  });

  test('should filter out disabled countries even with custom defaultCountry', () => {
    // Désactiver le Sénégal
    toggleCountry('SN', false);
    
    render(<PhoneInput defaultCountry="SN" />);
    
    const countriesElement = screen.getByTestId('countries');
    const defaultCountryElement = screen.getByTestId('default-country');
    
    // Vérifier que le Sénégal n'est pas dans la liste même si demandé comme défaut
    expect(countriesElement.textContent).toBe('GA');
    expect(defaultCountryElement.textContent).toBe('GA'); // Retour au premier pays activé
  });
}); 