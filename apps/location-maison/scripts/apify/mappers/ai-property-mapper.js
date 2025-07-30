const fetch = require('node-fetch');
const { configLoader } = require('../../ia/config/config-loader');
const { KeyManager } = require('../../ia/utils/key-manager');

class AIPropertyMapper {
  constructor() {
    this.config = configLoader;
    this.keyManager = new KeyManager();
  }

  async initialize() {
    await this.keyManager.initialize();
    await this.keyManager.loadKeyStats();
  }

  buildPrompt(post) {
    // Prendre plus de texte pour mieux analyser
    const fullText = post.text.length > 500 ? post.text.substring(0, 500) + '...' : post.text;
    
    return `Transforme ce post immobilier Gabon en JSON avec titre et description PROPRES et PROFESSIONNELS:

TYPES: Studio|Apartment|Home|Building|Desk|Shop|Kiosk|Room|Land

TAGS AUTORISÉS: Travail, Famille, Couple, Villa, Sous barrière, Meublé, Centre-ville, Vacances, Nature, Montagne, Piscine, Animaux admis, Commerces proches, Transport proche, Parking, Wi-Fi, Sécurisé, Vélo, Activités sportives, Adapté aux enfants, Accessible handicapés, Étudiant, Calme et tranquillité, Proche de la plage, Duplex, Boutique, Balcon, Terrasse, Collocation, Garage, Court séjour

RÈGLES IMPORTANTES POUR LE FORMATAGE:
1. **TITRE**: Créer un titre PROFESSIONNEL et DESCRIPTIF (max 80 caractères)
   - Corriger toutes les fautes d'orthographe
   - Utiliser la bonne casse (majuscules appropriées)
   - Inclure: type + caractéristiques principales + lieu
   - Exemples: "Appartement 2 chambres à louer à Nzeng-Ayong", "Studio meublé centre-ville Libreville"

2. **DESCRIPTION**: Réécrire en français CORRECT et PROFESSIONNEL
   - Corriger toutes les fautes d'orthographe et de grammaire
   - Supprimer les emojis et abréviations
   - Structurer en phrases complètes avec ponctuation
   - Utiliser la bonne casse pour les noms de lieux
   - Remplacer les abréviations (ex: "2ch" → "2 chambres", "dch" → "douche", "wc" → "WC")
   - Maximum 200 caractères, bien rédigé

JSON requis (TOUS les champs):
{
  "typeProperty": "Type",
  "title": "Titre propre et professionnel",
  "description": "Description bien rédigée en français correct",
  "price": 250000,
  "status": "FOR_RENT" ou "FOR_SALE",
  "contact": "téléphone du post",
  "street": "rue mentionnée",
  "city": "ville Gabon",
  "province": "province Gabon",
  "country": "Gabon",
  "countryCode": "GA",
  "longitude": 0,
  "latitude": 0,
  "area": 100,
  "images": [],
  "tags": ["choisir UNIQUEMENT dans TAGS AUTORISÉS"],
  "nbrRooms": 2,
  "nbrChickens": 1,
  "nbrBathrooms": 1,
  "nbrToilets": 1
}

Post original: "${fullText}"
Photos: ${post.photoCount}

Réponds SEULEMENT le JSON avec titre et description NETTOYÉS:`;
  }

  async mapPostsToProperties(posts) {
    const results = [];
    let processedCount = 0;

    console.log(`🤖 Traitement de ${posts.length} posts Facebook...\n`);

    for (const post of posts) {
      processedCount++;
      console.log(`📝 [${processedCount}/${posts.length}] Traitement du post: ${post.id}`);
      console.log(`   Texte: "${post.text.substring(0, 80)}..."`);
      console.log(`   Photos: ${post.photoCount}`);

      try {
        const result = await this.transformPost(post);
        results.push(result);
        
        if (result.success) {
          console.log(`   ✅ Succès - Type: ${result.data?.typeProperty}, Prix: ${result.data?.price}`);
        } else {
          console.log(`   ❌ Échec: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error}`);
        results.push({
          success: false,
          error: `Erreur lors du traitement: ${error}`,
          originalPost: post
        });
      }

      // Petite pause pour éviter le rate limiting
      if (processedCount < posts.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  async transformPost(post) {
    try {
      const config = await this.config.loadConfig();
      const currentKey = this.keyManager.getCurrentApiKey();
      
              if (!currentKey) {
          throw new Error('Aucune clé API disponible');
        }

        const prompt = this.buildPrompt(post);
        
                const response = await fetch(config.api.openrouter.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.api.openrouter.model,
            messages: [
              {
                role: "system",
                content: "Tu es un expert en immobilier au Gabon. Réponds uniquement avec du JSON valide."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: config.api.openrouter.max_tokens,
            temperature: 0.3,
          }),
      });

              // Enregistrer l'utilisation de la clé
        this.keyManager.incrementRequestCounter();

      if (!response.ok) {
        if (response.status === 429) {
          this.keyManager.switchToNextKey();
          throw new Error('Limite de taux atteinte, passage à la clé suivante');
        }
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Réponse API invalide');
      }

      const content = data.choices[0].message.content.trim();
      
      // Nettoyer la réponse et extraire le JSON
      let jsonContent = content;
      
      // Retirer les blocs markdown si présents
      if (content.includes('```')) {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonContent = jsonMatch[1].trim();
        }
      }
      
      // Retirer tout texte avant le premier { et après le dernier }
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
      }
      
      let propertyData;
      try {
        propertyData = JSON.parse(jsonContent);
      } catch (parseError) {
        console.log(`   🔍 Contenu reçu de l'IA: "${content.substring(0, 200)}..."`);
        throw new Error(`Impossible de parser le JSON de l'IA: ${parseError}`);
      }

      // Validation de base
      if (!propertyData.typeProperty || !propertyData.price) {
        throw new Error('Données essentielles manquantes dans la réponse IA');
      }

      // Ajouter les images du post
      propertyData.images = post.images;

      return {
        success: true,
        data: propertyData,
        originalPost: post
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        originalPost: post
      };
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async finalize() {
    await this.keyManager.saveKeyStats();
    console.log('🔑 Statistiques des clés API sauvegardées');
  }
}

module.exports = { AIPropertyMapper }; 