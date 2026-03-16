const fs = require('fs/promises');
const path = require('path');

class SimplePropertyExtractor {
  constructor() {
    this.JSON_FILES_DIR = path.resolve(__dirname, 'facebook-posts');
    this.OUTPUT_FILE = path.resolve(__dirname, 'facebook-transformed-properties.json');
  }

  // Mots-clés pour identifier les annonces immobilières
  getPropertyKeywords() {
    return [
      'à louer', 'à vendre', 'louer', 'vendre', 'location', 'vente',
      'appartement', 'maison', 'villa', 'studio', 'chambre', 'terrain',
      'maisonnette', 'duplex', 'triplex', 'loft', 'pavillon'
    ];
  }

  // Mots-clés pour identifier les types de propriétés
  getPropertyTypes() {
    return {
      'studio': 'Studio',
      'mini studio': 'Studio',
      'appartement': 'Apartment',
      'maison': 'Home',
      'villa': 'Home',
      'chambre': 'Room',
      'terrain': 'Land',
      'bureau': 'Desk',
      'commerce': 'Shop',
      'kiosque': 'Kiosk',
      'immeuble': 'Building'
    };
  }

  // Extraire le prix du texte
  extractPrice(text) {
    const pricePatterns = [
      /(\d+)\s*(?:mille|mil|000)/gi,
      /(\d+)\s*(?:f|f cfa|fcfa)/gi,
      /(\d+)\s*(?:€|euros?)/gi,
      /prix[:\s]*(\d+)/gi,
      /(\d+)\s*(?:par mois|par jour|par semaine)/gi
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        let price = parseInt(match[1]);
        
        // Convertir "mille" en milliers
        if (text.toLowerCase().includes('mille') || text.toLowerCase().includes('mil')) {
          price *= 1000;
        }
        
        return price;
      }
    }
    return 0;
  }

  // Extraire le statut (location ou vente)
  extractStatus(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('à louer') || lowerText.includes('louer') || lowerText.includes('location')) {
      return 'FOR_RENT';
    } else if (lowerText.includes('à vendre') || lowerText.includes('vendre') || lowerText.includes('vente')) {
      return 'FOR_SALE';
    }
    return 'FOR_RENT'; // Par défaut
  }

  // Extraire le contact (téléphone)
  extractContact(text) {
    const phonePatterns = [
      /(?:tel|tél|téléphone|phone|contact)[:\s]*(\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3})/gi,
      /(\d{2,3}[-\s]?\d{2,3}[-\s]?\d{2,3})/g
    ];

    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/[-\s]/g, '');
      }
    }
    return '';
  }

  // Extraire la ville et la rue
  extractLocation(text) {
    const cities = [
      'Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda', 
      'Ntoum', 'Lambarene', 'Mouila', 'Tchibanga', 'Makokou',
      'Koulamoutou', 'Bitam', 'Tsogni', 'Omboue', 'Gamba'
    ];

    const provinces = {
      'Libreville': 'Estuaire',
      'Port-Gentil': 'Ogooué-Maritime',
      'Franceville': 'Haut-Ogooué',
      'Oyem': 'Woleu-Ntem',
      'Moanda': 'Haut-Ogooué',
      'Lambarene': 'Ogooué-Maritime',
      'Mouila': 'Ngounié',
      'Tchibanga': 'Nyanga',
      'Makokou': 'Ogooué-Ivindo',
      'Koulamoutou': 'Ngounié',
      'Bitam': 'Woleu-Ntem'
    };

    let city = '';
    let street = '';

    // Chercher la ville
    for (const cityName of cities) {
      if (text.toLowerCase().includes(cityName.toLowerCase())) {
        city = cityName;
        break;
      }
    }

    // Chercher des indices de rue/quartier
    const streetPatterns = [
      /(?:à|sur|dans|zone|quartier)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|,|\.|$)/gi,
      /(?:rue|avenue|boulevard|place)\s+([A-Za-zÀ-ÿ\s]+?)(?:\s|,|\.|$)/gi
    ];

    for (const pattern of streetPatterns) {
      const match = text.match(pattern);
      if (match && match[1].trim().length > 2) {
        street = match[1].trim();
        break;
      }
    }

    return {
      city: city || 'Libreville',
      street: street || 'Non précisé',
      province: provinces[city] || 'Estuaire'
    };
  }

  // Extraire le nombre de pièces
  extractRoomCount(text) {
    const patterns = [
      /(\d+)\s*(?:chambre|chambres)/gi,
      /(\d+)\s*(?:pièce|pièces)/gi,
      /(\d+)\s*(?:salle|salles)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 0;
  }

  // Extraire le nombre de salles de bain
  extractBathroomCount(text) {
    const patterns = [
      /(\d+)\s*(?:salle de bain|salles de bain)/gi,
      /(\d+)\s*(?:douche|douches)/gi,
      /(\d+)\s*(?:wc|toilette|toilettes)/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 0;
  }

  // Générer des tags basés sur le contenu
  generateTags(text) {
    const tags = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('centre-ville') || lowerText.includes('centre ville')) tags.push('Centre-ville');
    if (lowerText.includes('barrière') || lowerText.includes('sécurisé')) tags.push('Sécurisé');
    if (lowerText.includes('parking')) tags.push('Parking');
    if (lowerText.includes('eau') && lowerText.includes('24')) tags.push('Eau en permanence');
    if (lowerText.includes('courant') || lowerText.includes('électricité')) tags.push('Électricité');
    if (lowerText.includes('terrasse')) tags.push('Terrasse');
    if (lowerText.includes('cuisine')) tags.push('Cuisine équipée');
    if (lowerText.includes('meublé')) tags.push('Meublé');
    if (lowerText.includes('famille')) tags.push('Famille');
    if (lowerText.includes('travail')) tags.push('Travail');
    if (lowerText.includes('étudiant')) tags.push('Étudiant');

    return tags.length > 0 ? tags : ['Non précisé'];
  }

  // Déterminer le type de propriété
  determinePropertyType(text) {
    const lowerText = text.toLowerCase();
    
    for (const [keyword, type] of Object.entries(this.getPropertyTypes())) {
      if (lowerText.includes(keyword)) {
        return type;
      }
    }
    
    return 'Home'; // Par défaut
  }

  // Traiter un post et extraire les informations
  processPost(post, fileName, index) {
    if (!post.text || post.text.trim() === '') {
      return null;
    }

    const text = post.text.trim();
    
    // Vérifier si c'est une annonce immobilière
    const hasPropertyKeywords = this.getPropertyKeywords().some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!hasPropertyKeywords) {
      return null;
    }

    // Extraire les images
    const images = [];
    if (post.attachments) {
      post.attachments.forEach(attachment => {
        // Structure d'album
        if (attachment.type === 'album' && attachment.images) {
          attachment.images.forEach(image => {
            if (image.url) images.push(image.url);
          });
        }
        // Structure standard
        if (attachment.__typename === 'Photo' && attachment.image?.uri) {
          images.push(attachment.image.uri);
        }
        // All subattachments
        if (attachment.all_subattachments && attachment.all_subattachments.nodes) {
          attachment.all_subattachments.nodes.forEach(subAttachment => {
            if (subAttachment.media && 
                subAttachment.media.__typename === 'Photo' && 
                subAttachment.media.image?.uri) {
              images.push(subAttachment.media.image.uri);
            }
          });
        }
      });
    }

    // Ignorer les posts sans images
    if (images.length < 2) {
      return null;
    }

    // Extraire toutes les informations
    const price = this.extractPrice(text);
    const status = this.extractStatus(text);
    const contact = this.extractContact(text);
         const location = this.extractLocation(text);
    const nbrRooms = this.extractRoomCount(text);
    const nbrBathrooms = this.extractBathroomCount(text);
    const typeProperty = this.determinePropertyType(text);
    const tags = this.generateTags(text);

    // Créer l'objet propriété
    const property = {
      typeProperty,
      title: this.generateTitle(typeProperty, location.city, nbrRooms),
      description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      price,
      status,
      contact,
      street: location.street,
      city: location.city,
      province: location.province,
      country: 'Gabon',
      countryCode: 'GA',
      longitude: 0,
      latitude: 0,
      area: 0,
      tags,
      images,
      nbrRooms,
      nbrBathrooms,
      nbrToilets: nbrBathrooms,
      nbrKitchens: 0
    };

    return {
      id: `${fileName.replace('.json', '')}_${index}`,
      success: true,
      data: property,
      originalPost: post
    };
  }

  // Générer un titre
  generateTitle(typeProperty, city, nbrRooms) {
    const typeNames = {
      'Studio': 'Studio',
      'Apartment': 'Appartement',
      'Home': 'Maison',
      'Room': 'Chambre',
      'Land': 'Terrain',
      'Desk': 'Bureau',
      'Shop': 'Commerce',
      'Kiosk': 'Kiosque',
      'Building': 'Immeuble'
    };

    const typeName = typeNames[typeProperty] || typeProperty;
    const roomText = nbrRooms > 0 ? ` ${nbrRooms} chambre${nbrRooms > 1 ? 's' : ''}` : '';
    
    return `${typeName}${roomText} à ${city}`;
  }

  // Traiter tous les fichiers
  async processAllFiles() {
    try {
      console.log('🚀 Démarrage de l\'extraction simple des propriétés...\n');
      
      const files = await fs.readdir(this.JSON_FILES_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('property-'));
      
      console.log(`📁 ${jsonFiles.length} fichiers JSON trouvés`);
      
      const allProperties = [];
      
      for (const file of jsonFiles) {
        console.log(`\n📄 Traitement de ${file}...`);
        const filePath = path.join(this.JSON_FILES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        let fileCount = 0;
        
        for (let i = 0; i < data.length; i++) {
          const post = data[i];
          const result = this.processPost(post, file, i);
          
          if (result && result.success) {
            allProperties.push(result.data);
            fileCount++;
            console.log(`  ✅ Propriété ${fileCount}: ${result.data.typeProperty} - ${result.data.city} - ${result.data.price > 0 ? result.data.price + ' FCFA' : 'Prix non précisé'}`);
          }
        }
        
        console.log(`  📊 ${fileCount} propriétés extraites de ${file}`);
      }
      
      // Sauvegarder les résultats
      if (allProperties.length > 0) {
        await fs.writeFile(this.OUTPUT_FILE, JSON.stringify(allProperties, null, 2), 'utf-8');
        console.log(`\n💾 ${allProperties.length} propriétés sauvegardées dans ${path.basename(this.OUTPUT_FILE)}`);
      } else {
        console.log('\n⚠️ Aucune propriété valide trouvée');
      }
      
      return allProperties;
      
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      throw error;
    }
  }
}

// Fonction principale
async function main() {
  try {
    const extractor = new SimplePropertyExtractor();
    const properties = await extractor.processAllFiles();
    
    console.log('\n🎉 Extraction terminée !');
    console.log(`📊 Total: ${properties.length} propriétés extraites`);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Lancer le script
if (require.main === module) {
  main();
}

module.exports = { SimplePropertyExtractor }; 