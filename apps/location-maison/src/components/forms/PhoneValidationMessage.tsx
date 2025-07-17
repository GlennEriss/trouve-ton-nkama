'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { validatePhoneNumberForSupportedCountries, getEnabledCountries } from '@/lib/phoneValidation';

interface PhoneValidationMessageProps {
  phoneNumber: string;
  showValidMessage?: boolean;
}

export const PhoneValidationMessage: React.FC<PhoneValidationMessageProps> = ({ 
  phoneNumber, 
  showValidMessage = false 
}) => {
  if (!phoneNumber) return null;

  const validation = validatePhoneNumberForSupportedCountries(phoneNumber);
  const enabledCountries = getEnabledCountries();

  if (validation.isValid && showValidMessage) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
        <CheckCircle className="h-4 w-4" />
        <span>{validation.message}</span>
      </div>
    );
  }

  if (!validation.isValid) {
    return (
      <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{validation.message}</span>
        </div>
        
        {/* Informations sur les pays supportés */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
            <Info className="h-4 w-4" />
            <span className="font-medium">Pays supportés :</span>
          </div>
          <div className="space-y-1 text-sm text-blue-700">
            {enabledCountries.map(country => (
              <div key={country.code} className="flex items-center gap-2">
                <span className="font-medium">{country.name}:</span>
                <span>Format international requis</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}; 