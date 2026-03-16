import fetch from 'node-fetch';
import { configLoader } from '../config/config-loader';
import { KeyManager } from '../utils/key-manager';
import { FacebookPost } from '../extractors/facebook-post-extractor';
import { TypePropertyEnum } from '../types/property-type';

export interface AIMappingResult {
  success: boolean;
  data?: any;
  error?: string;
  originalPost?: FacebookPost;
}

export class AIPropertyMapper {
  private config = configLoader;
  private keyManager: KeyManager;

  constructor() {
    this.keyManager = new KeyManager();
  }

  async initialize(): Promise<void> {
    await this.keyManager.initialize();
    await this.keyManager.loadKeyStats();
  }

  private buildPrompt(posts: FacebookPost[]): string {
    const availableTags = this.config.getAvailableTags();
    const post = posts[0];
    
    return `Tu es un assistant immobilier pour le Gabon. Transforme ce post Facebook en objet immobilier JSON.

TYPES (première lettre en majuscule): Studio|Apartment|Home|Building|Desk|Shop|Kiosk|Room|Land
NOTE: Si c'est une "villa", utiliser "Home" comme typeProperty

STRUCTURE:
{
  "typeProperty": "Type",
  "title": "Titre court",
  "description": "Description complète",
  "price": 250000,
  "status": "FOR_RENT" ou "FOR_SALE",
  "contact": "téléphone",
  "street": "rue",
  "city": "ville Gabon",
  "province": "province Gabon",
  "country": "Gabon",
  "countryCode": "GA",
  "longitude": 0,
  "latitude": 0,
  "area": 0,
  "tags": ["tag1"],
  "images": ["url1", "url2"],
  "nbrRooms": 0,
  "nbrBathrooms": 0,
  "nbrToilets": 0,
  "nbrKitchens": 0
}

TAGS: ${availableTags.join(', ')}

RÈGLES:
- Prix en FCFA, coordonnées 0 si non dispo, champs numériques 0 si non précisé
- Images: utiliser les URLs fournies dans imageUrlList
- TypeProperty: première lettre en majuscule (Studio, Apartment, Home, etc.)
- Si "villa" dans le texte → typeProperty = "Home"

POST: ${JSON.stringify(post.text)}
IMAGES: ${JSON.stringify(post.imageUrlList)}

RÉPONDRE UNIQUEMENT AVEC UN TABLEAU JSON: [{"propriété"}]`;
  }

  async mapPostsToProperties(posts: FacebookPost[]): Promise<AIMappingResult[]> {
    const results: AIMappingResult[] = [];
    
    console.log(`🤖 Début de la transformation IA de ${posts.length} posts...`);
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`\n--- Traitement du post ${i + 1}/${posts.length} ---`);
      
      try {
        const result = await this.mapSinglePost(post);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Post ${i + 1} transformé avec succès`);
        } else {
          console.log(`❌ Erreur pour le post ${i + 1}: ${result.error}`);
          
          // Si toutes les clés sont épuisées, arrêter le traitement
          if (result.error?.includes('Toutes les clés API ont atteint leur limite')) {
            console.log('\n🛑 Toutes les clés API sont épuisées. Arrêt du traitement.');
            console.log(`📊 Résultats partiels : ${results.filter(r => r.success).length} succès sur ${i + 1} posts traités`);
            break;
          }
        }
        
        // Délai entre les requêtes
        if (i < posts.length - 1) {
          const config = await this.config.loadConfig();
          await this.delay(config.limits.request_delay);
        }
        
      } catch (error) {
        console.error(`❌ Erreur fatale pour le post ${i + 1}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          originalPost: post
        });
        
        // Si toutes les clés sont épuisées, arrêter le traitement
        if (error instanceof Error && error.message.includes('Toutes les clés API ont atteint leur limite')) {
          console.log('\n🛑 Toutes les clés API sont épuisées. Arrêt du traitement.');
          console.log(`📊 Résultats partiels : ${results.filter(r => r.success).length} succès sur ${i + 1} posts traités`);
          break;
        }
      }
    }
    
    return results;
  }

  private async mapSinglePost(post: FacebookPost): Promise<AIMappingResult> {
    const config = await this.config.loadConfig();
    const openRouterConfig = config.api.openrouter;
    
    const prompt = this.buildPrompt([post]);
    
    const messages = [
      { role: "system", content: "Tu es un assistant immobilier qui répond toujours en JSON strictement valide." },
      { role: "user", content: prompt }
    ];

    const payload = {
      model: openRouterConfig.model,
      messages,
      max_tokens: openRouterConfig.max_tokens,
      stream: openRouterConfig.stream
    };

    const maxRetries = config.limits.max_retries;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🔑 Utilisation de la clé ${this.keyManager.getCurrentKeyIndex() + 1}`);
        
        const response = await fetch(openRouterConfig.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.keyManager.getCurrentApiKey()}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const err = await response.text();
          const error = new Error(`OpenRouter API error: ${response.status} - ${err}`);
          
          if (response.status === 429 && this.keyManager.isRateLimitError(error)) {
            console.log(`⚠️ Limite temporaire atteinte, attente avant basculement...`);
            await this.delay(config.limits.retry_delay);
            if (this.keyManager.switchToNextKey()) {
              console.log("🔄 Tentative avec la clé suivante...");
              await this.delay(1000);
              continue;
            } else {
              throw new Error("Toutes les clés API ont atteint leur limite quotidienne");
            }
          }
          
          throw error;
        }

        this.keyManager.incrementRequestCounter();
        
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        
        console.log('\nRéponse brute OpenRouter :\n', text);

        // Nettoyage et parsing du JSON
        const cleaned = text
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const result = JSON.parse(match[0]);
            const property = result[0]; // Prendre le premier élément du tableau
            
            // Corriger le type de propriété
            if (property.typeProperty) {
              // Première lettre en majuscule
              property.typeProperty = property.typeProperty.charAt(0).toUpperCase() + property.typeProperty.slice(1).toLowerCase();
              
              // Si c'est "Villa", changer en "Home"
              if (property.typeProperty === 'Villa') {
                property.typeProperty = 'Home';
              }
            }
            
            // Géolocaliser si on a une ville
            if (property.city && (property.longitude === 0 || property.latitude === 0)) {
              const coords = await this.geolocateAddress(property.city, property.street);
              property.longitude = coords.longitude;
              property.latitude = coords.latitude;
            }
            
            // S'assurer que les images sont bien présentes
            if (!property.images || property.images.length === 0) {
              property.images = post.imageUrlList || [];
            }
            
            return {
              success: true,
              data: property,
              originalPost: post
            };
          } catch (e) {
            console.warn('Erreur lors du parsing du JSON IA, réponse brute :', text);
            throw new Error('Erreur de parsing JSON dans la réponse IA');
          }
        }
        
        console.warn('Aucun JSON détecté dans la réponse IA :', text);
        throw new Error('Aucun JSON valide trouvé dans la réponse IA');

      } catch (error) {
        lastError = error;
        
        if (this.keyManager.isRateLimitError(error)) {
          console.log(`⚠️ Limite atteinte: ${error.message}`);
          if (this.keyManager.switchToNextKey()) {
            console.log("🔄 Tentative avec la clé suivante...");
            await this.delay(1000);
            continue;
          }
        }
        
        console.log(`❌ Erreur: ${error.message}`);
        if (attempt < maxRetries - 1) {
          console.log(`🔄 Nouvelle tentative (${attempt + 2}/${maxRetries})...`);
          await this.delay(config.limits.retry_delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Échec après toutes les tentatives',
      originalPost: post
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async geolocateAddress(city: string, street?: string): Promise<{longitude: number, latitude: number}> {
    try {
      const address = street ? `${street}, ${city}, Gabon` : `${city}, Gabon`;
      const encodedAddress = encodeURIComponent(address);
      const url = `https://photon.komoot.io/api/?q=${encodedAddress}&limit=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`⚠️ Erreur géolocalisation pour ${address}: ${response.status}`);
        return { longitude: 0, latitude: 0 };
      }
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].geometry.coordinates;
        console.log(`📍 Géolocalisation réussie pour ${address}: ${latitude}, ${longitude}`);
        return { longitude, latitude };
      }
      
      console.log(`⚠️ Aucune géolocalisation trouvée pour ${address}`);
      return { longitude: 0, latitude: 0 };
    } catch (error) {
      console.log(`❌ Erreur géolocalisation pour ${city}: ${error}`);
      return { longitude: 0, latitude: 0 };
    }
  }

  async finalize(): Promise<void> {
    // Sauvegarder les stats finales
    if (this.keyManager.getCurrentKeyIndex() > 0) {
      await this.keyManager.saveKeyStats();
    }
    
    this.keyManager.getDetailedKeyStats();
  }
} 