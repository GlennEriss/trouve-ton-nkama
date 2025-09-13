/**
 * Script simple pour mettre à jour les localisations avec les nouveaux IDs
 * Format: name_longitude_latitude (ex: estuaire_0.98226_1.56855)
 */

import { getSuggestions } from "@/db/suggestion.db";
import { createProvinceIfNotExists } from "@/db/province.db";
import { createCityIfNotExists } from "@/db/city.db";
import { createStreetIfNotExists } from "@/db/street.db";
import { LocationIdGenerator } from "@/db/generic.db";

// Types pour l'API Photon
interface PhotonGeometry {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface PhotonProperties {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  countrycode?: string;
}

interface PhotonFeature {
  geometry: PhotonGeometry;
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

/**
 * Service Photon simple
 */
class SimplePhotonService {
  private static readonly BASE_URL = "https://photon.komoot.io/api/";
  private static readonly COUNTRY = "Gabon";
  private static readonly COUNTRY_CODE = "ga";

  static async searchLocation(query: string): Promise<PhotonFeature | null> {
    try {
      const searchQuery = `${query.trim()} ${this.COUNTRY}`;
      const url = `${this.BASE_URL}?q=${encodeURIComponent(searchQuery)}&lat=0.7&lon=11.5&limit=3`;
      
      console.log(`🔍 Recherche Photon: ${query}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Simple-Location-Updater/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Photon API error: ${response.status}`);
      }

      const data: PhotonResponse = await response.json();
      
      // Filtrer pour le Gabon uniquement
      const gabonFeatures = data.features.filter(feature => 
        feature.properties.countrycode === this.COUNTRY_CODE ||
        feature.properties.country?.toLowerCase().includes('gabon')
      );

      if (gabonFeatures.length === 0) {
        console.warn(`⚠️  Aucun résultat trouvé pour: ${query}`);
        return null;
      }

      const bestMatch = gabonFeatures[0];
      const [longitude, latitude] = bestMatch.geometry.coordinates;
      console.log(`✅ Trouvé: ${bestMatch.properties.name} (${latitude}, ${longitude})`);
      
      return bestMatch;
    } catch (error) {
      console.error(`❌ Erreur lors de la recherche "${query}":`, error);
      return null;
    }
  }
}

/**
 * Mise à jour simple des localisations
 */
export class SimpleLocationUpdater {

  /**
   * Met à jour toutes les localisations depuis les suggestions
   */
  static async updateAllLocations(): Promise<{
    success: boolean;
    processed: {
      provinces: number;
      cities: number;
      streets: number;
    };
    errors: string[];
  }> {
    const stats = { provinces: 0, cities: 0, streets: 0 };
    const errors: string[] = [];

    try {
      console.log('🚀 Début de la mise à jour simple des localisations');

      // Récupérer les données de suggestions
      const suggestionsData = await getSuggestions();
      
      if (!suggestionsData) {
        throw new Error('Aucune donnée de suggestions trouvée');
      }

      console.log(`📊 Données récupérées: ${Object.keys(suggestionsData).length} provinces`);

      // Traiter chaque province
      for (const [provinceName, cities] of Object.entries(suggestionsData)) {
        try {
          console.log(`\n🏛️  === Province: ${provinceName} ===`);
          
          // Créer la province
          const provinceId = await this.createProvince(provinceName);
          if (provinceId) {
            stats.provinces++;
          }

          // Traiter chaque ville
          for (const [cityName, streets] of Object.entries(cities)) {
            try {
              console.log(`\n  🏙️  --- Ville: ${cityName} ---`);
              
              const cityId = await this.createCity(cityName, provinceName, provinceId || undefined);
              if (cityId) {
                stats.cities++;
              }

              // Traiter chaque rue
              for (const streetName of (streets as string[])) {
                try {
                  console.log(`    🛣️  Rue: ${streetName}`);
                  
                  const streetId = await this.createStreet(streetName, cityName, provinceName, cityId || undefined, provinceId || undefined);
                  if (streetId) {
                    stats.streets++;
                  }

                  // Délai pour éviter la surcharge
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                } catch (streetError) {
                  const errorMsg = `Erreur rue "${streetName}": ${streetError}`;
                  errors.push(errorMsg);
                  console.error(`❌ ${errorMsg}`);
                }
              }
            } catch (cityError) {
              const errorMsg = `Erreur ville "${cityName}": ${cityError}`;
              errors.push(errorMsg);
              console.error(`❌ ${errorMsg}`);
            }
          }
        } catch (provinceError) {
          const errorMsg = `Erreur province "${provinceName}": ${provinceError}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`\n✅ Mise à jour terminée`);
      console.log(`📊 Résultats:`);
      console.log(`   - Provinces: ${stats.provinces}`);
      console.log(`   - Villes: ${stats.cities}`);
      console.log(`   - Rues: ${stats.streets}`);
      
      if (errors.length > 0) {
        console.log(`⚠️  Erreurs: ${errors.length}`);
      }

      return {
        success: true,
        processed: stats,
        errors
      };

    } catch (error) {
      const errorMsg = `Erreur fatale: ${error}`;
      console.error(`💥 ${errorMsg}`);
      errors.push(errorMsg);
      
      return {
        success: false,
        processed: stats,
        errors
      };
    }
  }

  /**
   * Crée une province
   */
  private static async createProvince(provinceName: string): Promise<string | null> {
    try {
      // Rechercher sur Photon
      const photonData = await SimplePhotonService.searchLocation(provinceName);
      
      let longitude = 0;
      let latitude = 0;
      
      if (photonData) {
        [longitude, latitude] = photonData.geometry.coordinates;
      }

      // Créer la province
      const provinceData = {
        name: provinceName,
        country: "Gabon",
        countryCode: "ga",
        latitude,
        longitude,
        state: 'IN_PROGRESS' as const,
        searchableName: provinceName.toLowerCase()
      };

      const provinceId = await createProvinceIfNotExists(provinceData);
      
      if (provinceId) {
        console.log(`✅ Province "${provinceName}" créée (ID: ${provinceId})`);
      }
      
      return provinceId;
    } catch (error) {
      console.error(`❌ Erreur province "${provinceName}":`, error);
      return null;
    }
  }

  /**
   * Crée une ville
   */
  private static async createCity(cityName: string, provinceName: string, provinceId?: string): Promise<string | null> {
    try {
      // Rechercher sur Photon
      const searchQuery = `${cityName} ${provinceName}`;
      const photonData = await SimplePhotonService.searchLocation(searchQuery);
      
      let longitude = 0;
      let latitude = 0;
      
      if (photonData) {
        [longitude, latitude] = photonData.geometry.coordinates;
      }

      // Créer la ville
      const cityData = {
        name: cityName,
        provinceName,
        provinceId: provinceId || null,
        country: "Gabon",
        countryCode: "ga",
        latitude,
        longitude,
        state: 'IN_PROGRESS' as const,
        searchableName: cityName.toLowerCase()
      };

      const cityId = await createCityIfNotExists(cityData);
      
      if (cityId) {
        console.log(`✅ Ville "${cityName}" créée (ID: ${cityId})`);
      }
      
      return cityId;
    } catch (error) {
      console.error(`❌ Erreur ville "${cityName}":`, error);
      return null;
    }
  }

  /**
   * Crée une rue
   */
  private static async createStreet(
    streetName: string, 
    cityName: string, 
    provinceName: string, 
    cityId?: string, 
    provinceId?: string
  ): Promise<string | null> {
    try {
      // Rechercher sur Photon
      const searchQuery = `${streetName} ${cityName} ${provinceName}`;
      const photonData = await SimplePhotonService.searchLocation(searchQuery);
      
      let longitude = 0;
      let latitude = 0;
      
      if (photonData) {
        [longitude, latitude] = photonData.geometry.coordinates;
      }

      // Créer la rue
      const streetData = {
        name: streetName,
        cityName,
        cityId: cityId || null,
        provinceName,
        provinceId: provinceId || null,
        country: "Gabon",
        countryCode: "ga",
        latitude,
        longitude,
        state: 'IN_PROGRESS' as const,
        searchableName: streetName.toLowerCase()
      };

      const streetId = await createStreetIfNotExists(streetData);
      
      if (streetId) {
        console.log(`✅ Rue "${streetName}" créée (ID: ${streetId})`);
      }
      
      return streetId;
    } catch (error) {
      console.error(`❌ Erreur rue "${streetName}":`, error);
      return null;
    }
  }

  /**
   * Test du générateur d'ID
   */
  static testIdGenerator(): void {
    console.log('🧪 Test du générateur d\'ID');
    
    const testCases = [
      { name: 'Estuaire', longitude: 0.98226, latitude: 1.56855, type: 'province' },
      { name: 'Libreville', longitude: 9.4673, latitude: 0.4162, type: 'city' },
      { name: 'Sibang', longitude: 9.4673, latitude: 0.4162, type: 'street' }
    ];
    
    testCases.forEach(test => {
      let id: string;
      if (test.type === 'province') {
        id = LocationIdGenerator.generateProvince(test.name, test.longitude, test.latitude);
      } else if (test.type === 'city') {
        id = LocationIdGenerator.generateCity(test.name, test.longitude, test.latitude);
      } else {
        id = LocationIdGenerator.generateStreet(test.name, test.longitude, test.latitude);
      }
      console.log(`   ${test.type.toUpperCase()} "${test.name}" -> ${id}`);
    });
  }
}

// Export des fonctions utilitaires
export async function updateAllLocations() {
  return await SimpleLocationUpdater.updateAllLocations();
}

export function testIdGenerator() {
  return SimpleLocationUpdater.testIdGenerator();
}
