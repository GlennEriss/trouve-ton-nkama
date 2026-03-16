const fs = require('fs');
const path = require('path');

// Lire le fichier JSON
const inputFile = path.join(__dirname, 'property-1461755770615489.json');
const outputFile = path.join(__dirname, 'properties-extracted.json');

const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Types de propriétés possibles
const propertyTypes = {
  'studio': 'studio',
  'appartement': 'apartment',
  'maison': 'home',
  'villa': 'villa',
  'duplex': 'home',
  'terrain': 'land',
  'immeuble': 'building',
  'bureau': 'desk',
  'boutique': 'shop',
  'kiosque': 'kiosk',
  'chambre': 'room'
};

// Fonction pour extraire le prix depuis le texte
function extractPrice(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Patterns pour trouver le prix
  const patterns = [
    /(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /prix[:\s]*(\d+)\s*(?:mill|mille|mil)?/gi,
    /loyer[:\s]*(\d+)\s*(?:mill|mille|mil)?/gi,
    /(\d+)\s*(?:000\s*)?fcfa/gi,
    /(\d+)\s*(?:millions?|mio)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const priceStr = match[1] || match[0].replace(/[^\d]/g, '');
      let price = parseInt(priceStr);
      
      if (price > 0) {
        // Si le texte contient "mill", "mille", "mil" et le prix < 1000, multiplier par 1000
        if (price < 1000 && (lowerText.includes('mill') || lowerText.includes('mille') || lowerText.includes('mil'))) {
          price = price * 1000;
        }
        // Si le prix est entre 100 et 999 et qu'il y a "mill", c'est probablement en milliers
        if (price >= 100 && price < 1000 && (lowerText.includes('mill') || lowerText.includes('mille') || lowerText.includes('mil'))) {
          price = price * 1000;
        }
        return price;
      }
    }
  }
  
  return null;
}

// Fonction pour extraire le type de propriété
function extractPropertyType(text) {
  if (!text) return 'home'; // Par défaut
  
  const lowerText = text.toLowerCase();
  
  for (const [keyword, type] of Object.entries(propertyTypes)) {
    if (lowerText.includes(keyword)) {
      return type;
    }
  }
  
  return 'home'; // Par défaut
}

// Fonction pour extraire la localisation
function extractLocation(text) {
  if (!text) return null;
  
  // Patterns pour localisation
  const locationPatterns = [
    /(?:à|au|dans|vers|près|précisément)\s+([A-Z][a-zéèêàç]+(?:\s+[A-Z][a-zéèêàç]+)*)/g,
    /(?:pk|point kilométrique)\s*(\d+)/gi,
    /(?:quartier|zone)\s+([A-Z][a-zéèêàç]+(?:\s+[A-Z][a-zéèêàç]+)*)/gi,
    /(?:village|ville)\s+([A-Z][a-zéèêàç]+)/gi
  ];
  
  const locations = [];
  for (const pattern of locationPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 50) {
        const loc = match[1].trim();
        // Éviter les mots communs
        if (!['Prix', 'Loyer', 'Chambre', 'Salon', 'Cuisine'].includes(loc)) {
          locations.push(loc);
        }
      }
    }
  }
  
  return locations.length > 0 ? locations[0] : null;
}

// Fonction pour extraire les caractéristiques (chambres, salles de bain, etc.)
function extractFeatures(text) {
  if (!text) return {};
  
  const features = {
    nbrRooms: 0,
    nbrBathrooms: 0,
    nbrToilets: 0,
    area: 0
  };
  
  const lowerText = text.toLowerCase();
  
  // Chambres
  const roomMatch = lowerText.match(/(\d+)\s*(?:chambre|chbr|ch)/);
  if (roomMatch) {
    features.nbrRooms = parseInt(roomMatch[1]);
  }
  
  // Salles de bain / douches
  const bathroomMatch = lowerText.match(/(\d+)\s*(?:douche|salle\s*de\s*bain|sdb|wc)/);
  if (bathroomMatch) {
    features.nbrBathrooms = parseInt(bathroomMatch[1]);
  }
  
  // Toilettes
  const toiletMatch = lowerText.match(/(\d+)\s*(?:toilette|wc)/);
  if (toiletMatch) {
    features.nbrToilets = parseInt(toiletMatch[1]);
  }
  
  // Surface
  const areaMatch = lowerText.match(/(\d+)\s*(?:m[²2]|mètre|metre)/);
  if (areaMatch) {
    features.area = parseInt(areaMatch[1]);
  }
  
  return features;
}

// Fonction pour extraire le numéro de téléphone
function extractPhone(text) {
  if (!text) return null;
  
  const phonePattern = /(?:0|(?:\+241))?[67]\d{8}/g;
  const match = text.match(phonePattern);
  return match ? match[0].replace(/\s/g, '') : null;
}

// Fonction pour déterminer si c'est une location ou une vente
function extractStatus(text) {
  if (!text) return 'FOR_RENT';
  
  const lowerText = text.toLowerCase();
  if (lowerText.includes('vente') || lowerText.includes('à vendre') || lowerText.includes('vendre')) {
    return 'FOR_SALE';
  }
  return 'FOR_RENT';
}

// Fonction principale pour transformer un post en Property
function transformPostToProperty(post, index) {
  // Filtrer les attachments pour ne garder que les photos
  const photos = post.attachments?.filter(att => 
    att.__typename === 'Photo' && att.image && att.image.uri
  ) || [];
  
  if (photos.length === 0) {
    return null; // Pas d'images, on skip
  }
  
  // Extraire les informations
  const text = post.text || '';
  const price = extractPrice(text);
  const propertyType = extractPropertyType(text);
  const location = extractLocation(text);
  const features = extractFeatures(text);
  const phone = extractPhone(text);
  const status = extractStatus(text);
  
  // Créer les images
  const images = photos.map((photo, idx) => ({
    filePATH: `facebook/${post.user?.id || 'unknown'}_${index}_${idx}.jpg`,
    fileURL: photo.image.uri
  }));
  
  // Créer un titre à partir du texte
  let title = text.split('\n')[0].substring(0, 100).trim();
  if (!title || title.length < 10) {
    // Essayer de créer un titre à partir du type et de la localisation
    title = `${propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}`;
    if (location) {
      title += ` à ${location}`;
    }
    if (price) {
      title += ` - ${price.toLocaleString('fr-FR')} FCFA`;
    }
    if (title.length < 10) {
      title = `Annonce ${index + 1}`;
    }
  }
  
  // Créer la propriété
  const property = {
    // Informations de base
    typeProperty: propertyType,
    title: title,
    description: text.substring(0, 2000), // Limiter à 2000 caractères
    images: images,
    price: price || 0,
    area: features.area || 0,
    status: status,
    tags: [],
    contact: phone || '',
    
    // Localisation (valeurs par défaut pour le Gabon)
    street: location || '',
    city: 'Libreville', // Par défaut, peut être amélioré
    province: 'Estuaire', // Par défaut
    country: 'Gabon',
    countryCode: 'GA',
    longitude: 9.4672676, // Libreville par défaut
    latitude: 0.4161976,
    isLocExact: false,
    
    // Caractéristiques selon le type
    ...(propertyType === 'apartment' || propertyType === 'studio' || propertyType === 'home' || propertyType === 'villa' ? {
      nbrRooms: features.nbrRooms,
      nbrBathrooms: features.nbrBathrooms,
      nbrToilets: features.nbrToilets || features.nbrBathrooms,
      nbrKitchens: 0 // Par défaut
    } : {}),
    
    // Métadonnées Facebook
    _source: {
      facebookUrl: post.facebookUrl,
      userId: post.user?.id,
      userName: post.user?.name,
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0
    }
  };
  
  return property;
}

// Traiter tous les posts
const properties = [];
let processedCount = 0;

for (let i = 0; i < rawData.length; i++) {
  const post = rawData[i];
  const property = transformPostToProperty(post, i);
  
  if (property) {
    properties.push(property);
    processedCount++;
  }
}

// Sauvegarder le résultat
const output = {
  metadata: {
    source: 'Facebook Group',
    totalPosts: rawData.length,
    propertiesExtracted: properties.length,
    extractionDate: new Date().toISOString()
  },
  properties: properties
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf8');

console.log(`✅ Extraction terminée !`);
console.log(`📊 Total de posts analysés: ${rawData.length}`);
console.log(`🏠 Propriétés extraites: ${properties.length}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

