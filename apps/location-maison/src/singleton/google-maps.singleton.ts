/**
 * Singleton pour la gestion de l'instance Google Maps
 * Évite la recréation de l'instance à chaque montage de composant
 */

import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapsInstance {
  map: any;
  AdvancedMarkerElement: any;
  isInitialized: boolean;
}

class GoogleMapsSingleton {
  private static instance: GoogleMapsSingleton;
  private mapsLoader: Loader | null = null;
  private mapsInstance: GoogleMapsInstance | null = null;
  private initializationPromise: Promise<GoogleMapsInstance> | null = null;

  private constructor() {}

  public static getInstance(): GoogleMapsSingleton {
    if (!GoogleMapsSingleton.instance) {
      GoogleMapsSingleton.instance = new GoogleMapsSingleton();
    }
    return GoogleMapsSingleton.instance;
  }

  /**
   * Obtient le loader Google Maps (singleton)
   */
  public getMapsLoader(): Loader {
    if (!this.mapsLoader) {
      this.mapsLoader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: 'weekly',
        libraries: ['places', 'marker'],
      });
    }
    return this.mapsLoader;
  }

  /**
   * Initialise l'API Google Maps si ce n'est pas déjà fait
   */
  public async initializeMapsAPI(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.loadMapsAPI();
    await this.initializationPromise;
  }

  /**
   * Charge l'API Google Maps
   */
  private async loadMapsAPI(): Promise<GoogleMapsInstance> {
    try {
      const loader = this.getMapsLoader();
      await loader.load();
      
      if (!(window as any).google?.maps) {
        throw new Error('Google Maps introuvable après chargement.');
      }

      // Vérifie la présence d'AdvancedMarkerElement
      const AdvancedMarkerElement = (window as any).google?.maps?.marker?.AdvancedMarkerElement;
      if (!AdvancedMarkerElement) {
        throw new Error('AdvancedMarkerElement indisponible. Vérifie `libraries: [\'marker\']` et la version.');
      }

      this.mapsInstance = {
        map: null,
        AdvancedMarkerElement,
        isInitialized: true,
      };

      return this.mapsInstance;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Google Maps:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle instance de carte
   */
  public createMap(container: HTMLElement, options: any): any {
    if (!this.mapsInstance?.isInitialized) {
      throw new Error('Google Maps API non initialisée. Appelez initializeMapsAPI() d\'abord.');
    }

    const map = new (window as any).google.maps.Map(container, {
      ...options,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
      mapTypeId: (window as any).google.maps.MapTypeId.ROADMAP,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
      draggable: true,
      clickableIcons: true,
      keyboardShortcuts: true,
    });

    return map;
  }

  /**
   * Obtient l'AdvancedMarkerElement
   */
  public getAdvancedMarkerElement(): any {
    if (!this.mapsInstance?.isInitialized) {
      throw new Error('Google Maps API non initialisée. Appelez initializeMapsAPI() d\'abord.');
    }
    return this.mapsInstance.AdvancedMarkerElement;
  }

  /**
   * Vérifie si l'API est initialisée
   */
  public isInitialized(): boolean {
    return this.mapsInstance?.isInitialized || false;
  }

  /**
   * Nettoie les ressources (pour les tests ou le démontage)
   */
  public cleanup(): void {
    this.mapsInstance = null;
    this.initializationPromise = null;
  }
}

// Export de l'instance singleton
export const googleMapsSingleton = GoogleMapsSingleton.getInstance();

// Types utilitaires
export type GoogleMapsInstanceType = GoogleMapsInstance;
