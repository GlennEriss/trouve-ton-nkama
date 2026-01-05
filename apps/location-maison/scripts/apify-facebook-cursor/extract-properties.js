const fs = require('fs');
const path = require('path');

// Lire le fichier JSON
const inputFile = path.join(__dirname, 'property.json');
const outputFile = path.join(__dirname, 'properties-extracted.json');

const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Types de propriétés possibles
// Mapping des mots-clés français vers les clés TypeProperty (PascalCase)
// Les clés doivent correspondre aux clés de TypePropertyEnum, pas aux valeurs
const propertyTypes = {
  'studio': 'Studio',
  'appartement': 'Apartment',
  'maison': 'Home',
  'villa': 'Villa',
  'duplex': 'Home',
  'terrain': 'Land',
  'immeuble': 'Building',
  'bureau': 'Desk',
  'boutique': 'Shop',
  'kiosque': 'Kiosk',
  'chambre': 'Room'
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
// Retourne les clés de TypePropertyEnum (PascalCase: Home, Studio, Apartment, etc.)
function extractPropertyType(text) {
  if (!text) return 'Home'; // Par défaut (PascalCase)
  
  const lowerText = text.toLowerCase();
  
  for (const [keyword, type] of Object.entries(propertyTypes)) {
    if (lowerText.includes(keyword)) {
      return type; // Retourne la clé (PascalCase)
    }
  }
  
  return 'Home'; // Par défaut (PascalCase)
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

// Fonction pour vérifier si c'est une annonce immobilière
function isRealEstatePost(text) {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Mots-clés d'exclusion (non immobiliers)
  const excludeKeywords = [
    'téléphone', 'telephone', 'phone', 'iphone', 'samsung', 'tecno', 'xiaomi', 
    'smartphone', 'mobile', 'android', 'ios', 'gb', '128gb', '64gb', '32gb',
    'ordinateur', 'laptop', 'pc', 'tablette', 'ipad',
    'voiture', 'moto', 'véhicule', 'automobile', 'bmw', 'mercedes', 'toyota',
    'vêtement', 'vetement', 'habille', 'chaussure', 'sac',
    'recrutement', 'emploi', 'travail', 'job', 'cv', 'recrut',
    'alimentaire', 'restaurant', 'cuisine', 'repas',
    'formation', 'cours', 'école', 'université',
    'service', 'prestation',
    'vide grenier', 'videgrenier', 'vide-grenier',
    'plaque', 'granite', 'marbre', 'carrelage', 'faïence',
    'meuble', 'table', 'chaise', 'armoire', 'canapé', 'canape',
    'électroménager', 'electromenager', 'réfrigérateur', 'refrigerateur',
    'climatiseur', 'ventilateur', 'machine à laver', 'lave-linge',
    'vélo', 'velo', 'bicycle', 'moto', 'scooter'
  ];
  
  // Vérifier les exclusions en premier
  for (const keyword of excludeKeywords) {
    if (lowerText.includes(keyword)) {
      // Si c'est une exclusion ET qu'il n'y a pas de mot-clé immobilier fort, exclure
      const realEstateStrongKeywords = [
        'maison', 'appartement', 'studio', 'villa', 'duplex', 'terrain', 
        'immeuble', 'bureau', 'boutique', 'kiosque', 'chambre', 'logement',
        'loyer', 'louer', 'location', 'à louer', 'à vendre',
        'habitation', 'résidence', 'propriété', 'propriete'
      ];
      
      const hasStrongRealEstateKeyword = realEstateStrongKeywords.some(kw => lowerText.includes(kw));
      if (!hasStrongRealEstateKeyword) {
        return false;
      }
    }
  }
  
  // Exclusion spéciale : si le texte commence par "VIDE GRENIER" ou similaire, exclure
  if (lowerText.trim().startsWith('vide grenier') || lowerText.trim().startsWith('videgrenier')) {
    return false;
  }
  
  // Mots-clés d'inclusion (immobiliers)
  const includeKeywords = [
    'maison', 'appartement', 'studio', 'villa', 'duplex', 'triplex',
    'terrain', 'parcelle', 'immeuble', 'bâtiment',
    'bureau', 'local commercial', 'boutique', 'magasin', 'kiosque',
    'chambre', 'logement', 'habitation',
    'loyer', 'louer', 'location', 'à louer', 'à vendre', 'vente',
    'chambre', 'salon', 'cuisine', 'douche', 'salle de bain', 'wc', 'toilette',
    'parking', 'garage', 'cour', 'jardin', 'piscine',
    'quartier', 'rue', 'avenue', 'boulevard', 'zone', 'cité', 'village',
    'caution', 'charges', 'eau', 'électricité', 'forage',
    'm²', 'm2', 'mètre', 'superficie', 'surface'
  ];
  
  // Compter les mots-clés immobiliers
  let matchCount = 0;
  for (const keyword of includeKeywords) {
    if (lowerText.includes(keyword)) {
      matchCount++;
    }
  }
  
  // Si au moins 1 mot-clé immobilier est trouvé, c'est probablement une annonce immobilière
  return matchCount > 0;
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
  
  // Vérifier si c'est une annonce immobilière avant de continuer
  if (!isRealEstatePost(text)) {
    return null; // Pas une annonce immobilière, on skip
  }
  
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
      nbrChickens: 0 // Par défaut
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

