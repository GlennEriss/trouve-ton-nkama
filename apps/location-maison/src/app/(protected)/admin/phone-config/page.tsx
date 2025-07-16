import { PhoneCountryConfig } from '@/components/admin/PhoneCountryConfig';

export default function PhoneConfigPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Configuration des Numéros de Téléphone</h1>
          <p className="text-gray-600">
            Gérez les pays supportés pour la validation des numéros de téléphone
          </p>
        </div>
        
        <PhoneCountryConfig />
      </div>
    </div>
  );
} 