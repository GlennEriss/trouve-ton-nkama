const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour supprimer les émojis
function removeEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Émojis généraux
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Symboles
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Émojis visage
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Drapeaux
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplémentaires
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variantes
    .replace(/[\u{200D}]/gu, '') // Zero-width joiner
    .replace(/[\u{200B}]/gu, '') // Zero-width space
    .trim();
}

// Fonction pour nettoyer et normaliser le texte
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ') // Multiples espaces en un seul
    .replace(/\n+/g, '\n') // Multiples retours à la ligne en un seul
    .replace(/\*\*/g, '') // Supprimer **
    .replace(/\*/g, '') // Supprimer *
    .replace(/#/g, '') // Supprimer #
    .replace(/👉/g, '')
    .replace(/✅/g, '')
    .replace(/💰/g, '')
    .replace(/💼/g, '')
    .replace(/☎️/g, '')
    .replace(/📌/g, '')
    .replace(/🟩/g, '')
    .replace(/➡️/g, '')
    .replace(/🚨/g, '')
    .replace(/🇬🇦/g, '')
    .replace(/🤲/g, '')
    .replace(/🛑/g, '')
    .replace(/🤠/g, '')
    .replace(/🏡/g, '')
    .replace(/📍/g, '')
    .replace(/🏷️/g, '')
    .replace(/👣/g, '')
    .replace(/🚗/g, '')
    .replace(/🅿️/g, '')
    .replace(/💡/g, '')
    .replace(/💵/g, '')
    .replace(/🛏️/g, '')
    .replace(/🚽/g, '')
    .replace(/🚿/g, '')
    .trim();
}

// Fonction pour extraire le prix
function extractPrice(text) {
  const priceMatch = text.match(/(\d+)\s*(?:mille|mil|mill|m|000)/i);
  if (priceMatch) {
    return parseInt(priceMatch[1], 10) * 1000;
  }
  const directMatch = text.match(/(\d{4,})/);
  if (directMatch) {
    const num = parseInt(directMatch[1], 10);
    if (num > 10000) return num;
  }
  return null;
}

// Fonction pour formater le prix
function formatPrice(price) {
  if (!price) return '';
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)} million${price > 1000000 ? 's' : ''} FCFA`;
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

// Fonction pour reformuler un titre
function reformulateTitle(property) {
  const type = property.typeProperty;
  const typeMap = {
    'Room': 'Chambre',
    'Home': 'Maison',
    'Apartment': 'Appartement',
    'Studio': 'Studio',
    'Villa': 'Villa',
    'Shop': 'Local commercial',
    'Land': 'Terrain'
  };
  const typeName = typeMap[type] || 'Bien immobilier';
  
  // Extraire la localisation - privilégier le quartier/rue si disponible
  let location = '';
  if (property.street && property.street.length > 3 && property.street !== 'précisément' && property.street.length < 30) {
    location = property.street;
  } else if (property.city) {
    location = property.city;
  }
  
  // Extraire le prix
  const price = property.price;
  
  // Construire un titre professionnel et accrocheur (max 80 caractères)
  let title = '';
  
  // Ajouter des adjectifs selon le type et les caractéristiques
  const adjectives = [];
  if (property.tags) {
    if (property.tags.includes('Sous barrière') || property.tags.includes('Sécurisé')) {
      adjectives.push('Sécurisé');
    }
    if (property.tags.includes('Meublé')) {
      adjectives.push('Meublé');
    }
    if (property.nbrRooms >= 3) {
      adjectives.push('Spacieux');
    }
    if (property.tags.includes('Piscine')) {
      adjectives.push('Avec piscine');
    }
    if (property.tags.includes('Duplex')) {
      adjectives.push('Duplex');
    }
  }
  
  // Construire le titre
  if (adjectives.length > 0) {
    title = `${adjectives[0]} ${typeName.toLowerCase()}`;
  } else {
    title = typeName;
  }
  
  title += ' à louer';
  
  if (location) {
    // Limiter la longueur de la localisation si nécessaire
    const locationPart = ` à ${location}`;
    if (title.length + locationPart.length + (price ? formatPrice(price).length + 3 : 0) > 80) {
      // Utiliser seulement la ville si le titre devient trop long
      location = property.city || location.split(',')[0];
      const shortLocationPart = ` à ${location}`;
      if (title.length + shortLocationPart.length + (price ? formatPrice(price).length + 3 : 0) <= 80) {
        title += shortLocationPart;
      }
    } else {
      title += locationPart;
    }
  }
  
  if (price && title.length + formatPrice(price).length + 3 <= 80) {
    title += ` - ${formatPrice(price)}`;
  }
  
  return title;
}

// Fonction pour reformuler une description
function reformulateDescription(property) {
  const originalDesc = property.description || '';
  const title = property.title || '';
  const fullText = `${title} ${originalDesc}`;
  
  // Nettoyer la description
  let desc = removeEmojis(originalDesc);
  desc = cleanText(desc);
  
  // Extraire les informations importantes
  const type = property.typeProperty;
  const typeMap = {
    'Room': 'chambre',
    'Home': 'maison',
    'Apartment': 'appartement',
    'Studio': 'studio',
    'Villa': 'villa',
    'Shop': 'local commercial',
    'Land': 'terrain'
  };
  const typeName = typeMap[type] || 'bien immobilier';
  
  // Extraire les caractéristiques
  const features = [];
  if (property.nbrRooms > 0) {
    features.push(`${property.nbrRooms} chambre${property.nbrRooms > 1 ? 's' : ''}`);
  }
  if (property.nbrBathrooms > 0) {
    features.push(`${property.nbrBathrooms} salle${property.nbrBathrooms > 1 ? 's' : ''} de bain`);
  }
  if (property.nbrToilets > 0) {
    features.push(`${property.nbrToilets} WC${property.nbrToilets > 1 ? '' : ''}`);
  }
  if (property.nbrLivingRoom > 0) {
    features.push(`${property.nbrLivingRoom} salon${property.nbrLivingRoom > 1 ? 's' : ''}`);
  }
  if (property.nbrChickens > 0) {
    features.push('cuisine');
  }
  
  // Extraire la localisation
  const locationParts = [];
  if (property.street) locationParts.push(property.street);
  if (property.city) locationParts.push(property.city);
  if (property.province && property.province !== property.city) {
    locationParts.push(property.province);
  }
  const location = locationParts.join(', ');
  
  // Extraire le prix
  const price = property.price;
  
  // Extraire les conditions
  const conditions = [];
  const descLower = desc.toLowerCase();
  if (descLower.includes('caution')) {
    conditions.push('caution requise');
  }
  if (descLower.includes('visite payante') || descLower.includes('visite 5000')) {
    conditions.push('visite payante');
  }
  if (descLower.includes('frais') || descLower.includes('commission')) {
    conditions.push('frais d\'agence');
  }
  
  // Construire la nouvelle description de manière professionnelle
  let newDesc = '';
  
  // Introduction - utiliser le même type que dans le titre
  const descTypeMap = {
    'Room': 'chambre',
    'Home': 'maison',
    'Apartment': 'appartement',
    'Studio': 'studio',
    'Villa': 'villa',
    'Shop': 'local commercial',
    'Land': 'terrain'
  };
  const descTypeName = descTypeMap[type] || 'bien immobilier';
  
  newDesc += `${descTypeName.charAt(0).toUpperCase() + descTypeName.slice(1)} à louer`;
  if (location) {
    newDesc += ` situé${descTypeName.endsWith('e') ? 'e' : ''} ${location}`;
  }
  newDesc += '.\n\n';
  
  // Caractéristiques
  if (features.length > 0) {
    newDesc += 'CARACTÉRISTIQUES :\n';
    features.forEach(feature => {
      newDesc += `- ${feature.charAt(0).toUpperCase() + feature.slice(1)}\n`;
    });
    
    // Ajouter d'autres caractéristiques depuis les tags
    if (property.tags && property.tags.length > 0) {
      const tagMap = {
        'Parking': 'Parking disponible',
        'Garage': 'Garage',
        'Balcon': 'Balcon',
        'Terrasse': 'Terrasse',
        'Piscine': 'Piscine',
        'Sous barrière': 'Sous barrière sécurisée',
        'Sécurisé': 'Sécurisé',
        'Wi-Fi': 'Wi-Fi',
        'Meublé': 'Meublé',
        'Centre-ville': 'En centre-ville'
      };
      
      property.tags.forEach(tag => {
        if (tagMap[tag] && !features.some(f => f.toLowerCase().includes(tag.toLowerCase()))) {
          newDesc += `- ${tagMap[tag]}\n`;
        }
      });
    }
    newDesc += '\n';
  }
  
  // Prix
  if (price) {
    newDesc += `LOYER MENSUEL : ${formatPrice(price)}\n`;
    const descLower = originalDesc.toLowerCase();
    if (descLower.includes('sans charge') || descLower.includes('hors charge')) {
      newDesc += 'Hors charges.\n';
    } else if (descLower.includes('avec charge') || descLower.includes('toutes les charges')) {
      newDesc += 'Charges comprises.\n';
    }
    newDesc += '\n';
  }
  
  // Conditions
  if (conditions.length > 0) {
    newDesc += 'CONDITIONS :\n';
    conditions.forEach(condition => {
      newDesc += `- ${condition.charAt(0).toUpperCase() + condition.slice(1)}\n`;
    });
    newDesc += '\n';
  }
  
  // Contact
  if (property.contact) {
    const contact = property.contact.replace(/\+241/g, '').replace(/\s/g, '');
    newDesc += `CONTACT : ${contact}\n`;
  }
  
  // Nettoyer les lignes vides multiples
  newDesc = newDesc.replace(/\n{3,}/g, '\n\n').trim();
  
  return newDesc;
}

console.log('📖 Lecture du fichier...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const data = JSON.parse(rawData);

console.log('✨ Nettoyage et professionnalisation des titres et descriptions...');
let updatedCount = 0;

data.properties = data.properties.map((property, index) => {
  const originalTitle = property.title;
  const originalDesc = property.description;
  
  const newTitle = reformulateTitle(property);
  const newDesc = reformulateDescription(property);
  
  if (newTitle !== originalTitle || newDesc !== originalDesc) {
    updatedCount++;
    property.title = newTitle;
    property.description = newDesc;
  }
  
  return property;
});

fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Professionnalisation terminée !');
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés mises à jour: ${updatedCount}/${data.properties.length}`);
console.log(`💾 Fichier sauvegardé: ${inputFile}`);

