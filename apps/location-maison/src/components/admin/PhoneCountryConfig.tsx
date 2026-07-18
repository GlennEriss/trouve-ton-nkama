'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  getEnabledCountries, 
  toggleCountry, 
  SUPPORTED_COUNTRIES, 
  GABON_NEW_NUMBERING_INFO,
  type SupportedCountry 
} from '@/lib/phoneValidation';
import { 
  Phone, 
  Globe, 
  Settings, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Save,
  RefreshCw
} from 'lucide-react';

export const PhoneCountryConfig: React.FC = () => {
  const { toast } = useToast();
  const [enabledCountries, setEnabledCountries] = useState<SupportedCountry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Charger les pays activés
    const enabled = getEnabledCountries().map(country => country.code);
    setEnabledCountries(enabled);
  }, []);

  const handleToggleCountry = (countryCode: SupportedCountry, enabled: boolean) => {
    try {
      toggleCountry(countryCode, enabled);
      
      // Mettre à jour l'état local
      if (enabled) {
        setEnabledCountries(prev => [...prev, countryCode]);
      } else {
        setEnabledCountries(prev => prev.filter(code => code !== countryCode));
      }

      toast({
        title: `${enabled ? 'Activé' : 'Désactivé'}`,
        description: `Les numéros ${SUPPORTED_COUNTRIES[countryCode].name} sont maintenant ${enabled ? 'acceptés' : 'rejetés'}.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      // Ici, vous pourriez sauvegarder la configuration dans une base de données
      // ou dans les variables d'environnement
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation
      
      toast({
        title: 'Configuration sauvegardée',
        description: 'Les paramètres ont été sauvegardés avec succès.',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConfig = () => {
    // Réinitialiser à la configuration par défaut (Gabon seulement)
    setEnabledCountries(['GA']);
    toggleCountry('SN', false);
    toggleCountry('GA', true);
    
    toast({
      title: 'Configuration réinitialisée',
      description: 'Retour à la configuration par défaut (Gabon seulement).',
      variant: 'default',
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration principale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration des Pays Supportés
          </CardTitle>
          <CardDescription>
            Activez ou désactivez les pays pour la validation des numéros de téléphone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(SUPPORTED_COUNTRIES).map(([code, config]) => (
            <div key={code} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-medium">{config.name}</h3>
                  <p className="text-sm text-gray-500">
                    Code: {config.countryCode} • Préfixes: {config.validPrefixes.join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={enabledCountries.includes(code as SupportedCountry) ? 'default' : 'secondary'}>
                  {enabledCountries.includes(code as SupportedCountry) ? 'Activé' : 'Désactivé'}
                </Badge>
                <Switch
                  aria-label={`${enabledCountries.includes(code as SupportedCountry) ? 'Désactiver' : 'Activer'} ${config.name}`}
                  checked={enabledCountries.includes(code as SupportedCountry)}
                  onCheckedChange={(checked) => handleToggleCountry(code as SupportedCountry, checked)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Informations sur la nouvelle numérotation gabonaise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Nouvelle Numérotation Gabonaise
          </CardTitle>
          <CardDescription>
            Informations sur la mise à jour de la numérotation en 2024
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Nouveaux Préfixes
              </h4>
              <div className="flex flex-wrap gap-1">
                {GABON_NEW_NUMBERING_INFO.newPrefixes.map(prefix => (
                  <Badge key={prefix} variant="outline" className="bg-green-50">
                    {prefix}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Anciens Préfixes (Compatibilité)
              </h4>
              <div className="flex flex-wrap gap-1">
                {GABON_NEW_NUMBERING_INFO.oldPrefixes.map(prefix => (
                  <Badge key={prefix} variant="outline" className="bg-orange-50">
                    {prefix}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Description:</strong> {GABON_NEW_NUMBERING_INFO.description}</p>
            <p><strong>Migration:</strong> {GABON_NEW_NUMBERING_INFO.migration}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={handleSaveConfig} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleResetConfig}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Variable d'environnement:</strong> NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES</p>
          <p><strong>Format:</strong> GA,SN (pour activer Gabon et Sénégal)</p>
          <p><strong>Défaut:</strong> GA (Gabon seulement)</p>
          <p className="text-gray-600">
            Note: Les changements effectués ici sont temporaires. Pour une configuration permanente, 
            utilisez la variable d'environnement NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
