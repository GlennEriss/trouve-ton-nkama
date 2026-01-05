const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour normaliser le texte
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^\w\s]/g, ' ') // Remplacer ponctuation par espace
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

// Fonction pour extraire un nombre depuis un texte avec différents patterns
function extractNumber(text, patterns) {
  const lowerText = normalizeText(text);
  for (const pattern of patterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || match[0]);
      if (num > 0) return num;
    }
  }
  return 0;
}

// Fonction pour extraire les attributs communs à Logement
function extractLogementAttributes(text) {
  const attrs = {
    nbrRooms: 0,
    nbrChickens: 0,
    nbrBathrooms: 0,
    nbrToilets: 0
  };

  const lowerText = normalizeText(text);
  
  // Chambres (chercher des patterns plus précis)
  const roomPatterns = [
    /(\d+)\s+(?:grandes?|petites?|grand|petit)?\s*(?:chambres?|chbr|ch|bedroom)\b/i,  // "4 grandes chambres" ou "2 chambre"
    /(\d+)\s*(?:chambre|chambres|chbr|ch|bedroom)\b/i,  // "2 chambres" ou "2 chambre"
    /(?:chambre|chambres|chbr|ch)\s*[:=]?\s*(\d+)/i,      // "chambre: 2"
    /\b(\d+)\s*ch\b/i,                                     // "2 ch" (mot complet)
    /\b(une|un)\s+(?:chambre|chbr)\b/i                    // "une chambre" ou "un chambre" = 1
  ];
  
  for (const pattern of roomPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let num;
      if (match[1] === 'une' || match[1] === 'un') {
        num = 1;
      } else {
        num = parseInt(match[1] || match[2] || match[0]);
      }
      // Valider que le nombre est raisonnable (1-20 chambres)
      if (num > 0 && num <= 20) {
        attrs.nbrRooms = num;
        break;
      }
    }
  }
  
  // Si on n'a pas trouvé mais qu'il y a "chambre" au singulier (sans nombre), on peut inférer 1
  // Sauf si c'est une propriété de type "Room" (c'est déjà une chambre)
  if (attrs.nbrRooms === 0 && lowerText.match(/\bchambre\b/i) && !lowerText.match(/\d+\s+chambre/i)) {
    attrs.nbrRooms = 1;
  }

  // Cuisines (nbrChickens = nombre de cuisines)
  const kitchenPatterns = [
    /(\d+)\s*(?:cuisine|cuisines|kitchen)\b/i,
    /(?:cuisine|kitchen)\s*[:=]?\s*(\d+)/i,
    /(\d+)\s*(?:grande|grandes|petite|petites)?\s*cuisine\b/i
  ];
  
  for (const pattern of kitchenPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || match[0]);
      if (num > 0 && num <= 10) {
        attrs.nbrChickens = num;
        break;
      }
    }
  }
  
  // Si pas de cuisine explicite, on peut inférer 1 si c'est un logement
  if (attrs.nbrChickens === 0 && (lowerText.includes('cuisine') || lowerText.includes('kitchen'))) {
    attrs.nbrChickens = 1;
  }

  // Salles de bain / Douches
  const bathroomPatterns = [
    /(\d+)\s+(?:grandes?|petites?|grand|petit|bien\s+equipe)?\s*(?:douches?|salle\s*de\s*bain|salles\s*de\s*bain|sdb|bathroom|bain)\b/i,
    /(\d+)\s*(?:douche|douches|salle\s*de\s*bain|salles\s*de\s*bain|sdb|bathroom|bain)\b/i,
    /(?:douche|douches|salle\s*de\s*bain|sdb)\s*[:=]?\s*(\d+)/i,
    /(?:une|un)\s+(?:douche|salle\s*de\s*bain|sdb)\b/i  // "une douche" = 1
  ];
  
  for (const pattern of bathroomPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let num;
      if (match[1] === 'une' || match[1] === 'un') {
        num = 1;
      } else {
        num = parseInt(match[1] || match[2] || match[0]);
      }
      if (num > 0 && num <= 20) {
        attrs.nbrBathrooms = num;
        break;
      }
    }
  }

  // Toilettes / WC
  const toiletPatterns = [
    /(\d+)\s*(?:toilette|toilettes|wc|toilet)\b/i,
    /(?:toilette|toilettes|wc)\s*[:=]?\s*(\d+)/i
  ];
  
  for (const pattern of toiletPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const num = parseInt(match[1] || match[2] || match[0]);
      if (num > 0 && num <= 20) {
        attrs.nbrToilets = num;
        break;
      }
    }
  }
  // Si pas de WC explicite mais qu'il y a des douches, on peut mettre le même nombre
  if (attrs.nbrToilets === 0 && attrs.nbrBathrooms > 0) {
    attrs.nbrToilets = attrs.nbrBathrooms;
  }

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Home
function extractHomeAttributes(text) {
  const attrs = {
    nbrFloors: 0,
    nbrGarages: 0,
    nbrLivingRoom: 0
  };

  const lowerText = normalizeText(text);
  
  // Étages / Floors
  attrs.nbrFloors = extractNumber(lowerText, [
    /(\d+)\s*(?:etage|étage|floor|niveau|niveaux)/,
    /(?:etage|étage|floor|niveau)\s*[:=]?\s*(\d+)/,
    /duplex/i // Duplex = 2 étages
  ]);
  if (lowerText.includes('duplex')) {
    attrs.nbrFloors = Math.max(attrs.nbrFloors, 2);
  }
  if (attrs.nbrFloors === 0 && !lowerText.includes('rez de chaussee') && !lowerText.includes('rdc')) {
    attrs.nbrFloors = 1; // Par défaut 1 étage
  }

  // Garages
  attrs.nbrGarages = extractNumber(lowerText, [
    /(\d+)\s*(?:garage|garages)/,
    /(?:garage)\s*[:=]?\s*(\d+)/,
    /(?:avec|avec un)\s*(?:garage|parking)/i
  ]);
  if (lowerText.includes('garage') && attrs.nbrGarages === 0) {
    attrs.nbrGarages = 1;
  }

  // Salons / Living rooms
  attrs.nbrLivingRoom = extractNumber(lowerText, [
    /(\d+)\s*(?:salon|salons|living|salle\s*de\s*sejour|sejour)/,
    /(?:salon|salons|living)\s*[:=]?\s*(\d+)/,
    /(\d+)\s*(?:grand|petit)?\s*salon/i
  ]);

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Apartment
function extractApartmentAttributes(text) {
  const attrs = {
    nbrFloorApartment: 0,
    numeroApartment: ''
  };

  const lowerText = normalizeText(text);
  
  // Numéro d'étage
  attrs.nbrFloorApartment = extractNumber(lowerText, [
    /(?:etage|étage|floor|niveau)\s*[:=]?\s*(\d+)/,
    /(\d+)\s*(?:eme|ème|er|ere)\s*(?:etage|étage|floor)/,
    /(?:au|au)\s*(\d+)\s*(?:etage|étage|floor)/
  ]);

  // Numéro d'appartement (plus difficile à extraire, souvent dans l'adresse)
  const aptNumMatch = lowerText.match(/(?:appartement|apt|app|numero|n°|#)\s*(?:[:=]?\s*)?([a-z0-9]+)/i);
  if (aptNumMatch) {
    attrs.numeroApartment = aptNumMatch[1].toUpperCase();
  }

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Studio
function extractStudioAttributes(text) {
  const attrs = {
    nbrFloorStudio: 0,
    numeroStudio: ''
  };

  const lowerText = normalizeText(text);
  
  // Numéro d'étage (même logique que Apartment)
  attrs.nbrFloorStudio = extractNumber(lowerText, [
    /(?:etage|étage|floor|niveau)\s*[:=]?\s*(\d+)/,
    /(\d+)\s*(?:eme|ème|er|ere)\s*(?:etage|étage|floor)/
  ]);

  // Numéro de studio
  const studioNumMatch = lowerText.match(/(?:studio|numero|n°|#)\s*(?:[:=]?\s*)?([a-z0-9]+)/i);
  if (studioNumMatch) {
    attrs.numeroStudio = studioNumMatch[1].toUpperCase();
  }

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Villa
function extractVillaAttributes(text) {
  const attrs = {
    nbrPiscine: 0
  };

  const lowerText = normalizeText(text);
  
  // Piscines
  attrs.nbrPiscine = extractNumber(lowerText, [
    /(\d+)\s*(?:piscine|piscines|pool|swimming\s*pool)/,
    /(?:avec|avec une)\s*(?:piscine|pool)/i
  ]);
  if (lowerText.includes('piscine') && attrs.nbrPiscine === 0) {
    attrs.nbrPiscine = 1;
  }

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Room
function extractRoomAttributes(text) {
  const attrs = {
    roomType: ''
  };

  const lowerText = normalizeText(text);
  const originalText = text.toLowerCase();
  
  // Types de chambre courants (chercher dans le titre et la description)
  // Chercher "chambre américaine" ou "chambre americaine" (avec ou sans accents)
  // Priorité 1: "chambre américaine" ou "chambre americaine" (avec "chambre")
  if (originalText.match(/chambre\s+(americaine|américaine)/i) || 
      originalText.match(/(americaine|américaine)\s+chambre/i)) {
    attrs.roomType = 'Américaine';
  } 
  // Priorité 2: Juste "américaine" dans le texte (souvent dans le titre)
  else if (originalText.includes('américaine') || originalText.includes('americaine')) {
    attrs.roomType = 'Américaine';
  } 
  // Autres types
  else if (originalText.match(/chambre\s+simple/i) || 
           originalText.match(/simple\s+chambre/i) ||
           (lowerText.includes('simple') && lowerText.includes('chambre'))) {
    attrs.roomType = 'Simple';
  } else if (originalText.match(/chambre\s+double/i) || 
             originalText.match(/double\s+chambre/i) ||
             (lowerText.includes('double') && lowerText.includes('chambre'))) {
    attrs.roomType = 'Double';
  } else if (originalText.match(/chambre\s+individuelle/i) || 
             originalText.match(/individuelle\s+chambre/i) ||
             lowerText.includes('individuelle') || lowerText.includes('individuel')) {
    attrs.roomType = 'Individuelle';
  } else if (originalText.match(/chambre\s+partage/i) || 
             originalText.match(/chambre\s+partagée/i) ||
             originalText.match(/partage\s+chambre/i) ||
             lowerText.includes('partage') || lowerText.includes('partagé')) {
    attrs.roomType = 'Partagée';
  } else if (lowerText.includes('colocation') || lowerText.includes('coloc')) {
    attrs.roomType = 'Collocation';
  }
  // Si rien n'est trouvé, laisser vide (sera géré par le code appelant)

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Shop
function extractShopAttributes(text) {
  const attrs = {
    nbrRooms: 0,
    nbrToilet: 0
  };

  const lowerText = normalizeText(text);
  
  // Pièces / Locaux
  attrs.nbrRooms = extractNumber(lowerText, [
    /(\d+)\s*(?:local|locaux|piece|pieces|room)/,
    /(?:local|locaux)\s*[:=]?\s*(\d+)/
  ]);

  // Toilettes
  attrs.nbrToilet = extractNumber(lowerText, [
    /(\d+)\s*(?:toilette|wc|toilet)/,
    /(?:toilette|wc)\s*[:=]?\s*(\d+)/
  ]);

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Kiosk
function extractKioskAttributes(text) {
  const attrs = {
    kioskType: ''
  };

  const lowerText = normalizeText(text);
  
  // Types de kiosque
  if (lowerText.includes('alimentaire') || lowerText.includes('nourriture')) {
    attrs.kioskType = 'Alimentaire';
  } else if (lowerText.includes('bureau') || lowerText.includes('administratif')) {
    attrs.kioskType = 'Bureau';
  } else if (lowerText.includes('pharmacie')) {
    attrs.kioskType = 'Pharmacie';
  } else {
    attrs.kioskType = 'Standard';
  }

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Building
function extractBuildingAttributes(text) {
  const attrs = {
    nbrApartments: 0,
    nbrFloors: 0,
    hasParking: false
  };

  const lowerText = normalizeText(text);
  
  // Nombre d'appartements
  attrs.nbrApartments = extractNumber(lowerText, [
    /(\d+)\s*(?:appartement|apt|app|logement)/,
    /(?:appartement|apt|app)\s*[:=]?\s*(\d+)/
  ]);

  // Nombre d'étages
  attrs.nbrFloors = extractNumber(lowerText, [
    /(\d+)\s*(?:etage|étage|floor|niveau)/,
    /(?:etage|étage|floor|niveau)\s*[:=]?\s*(\d+)/
  ]);

  // Parking
  attrs.hasParking = lowerText.includes('parking') || lowerText.includes('garage');

  return attrs;
}

// Fonction pour extraire les attributs spécifiques à Desk
function extractDeskAttributes(text) {
  const attrs = {
    nbrToilets: 0,
    nbrRooms: 0
  };

  const lowerText = normalizeText(text);
  
  // Pièces / Bureaux
  attrs.nbrRooms = extractNumber(lowerText, [
    /(\d+)\s*(?:bureau|bureaux|piece|pieces|room)/,
    /(?:bureau|bureaux)\s*[:=]?\s*(\d+)/
  ]);

  // Toilettes
  attrs.nbrToilets = extractNumber(lowerText, [
    /(\d+)\s*(?:toilette|wc|toilet)/,
    /(?:toilette|wc)\s*[:=]?\s*(\d+)/
  ]);

  return attrs;
}

// Fonction principale pour enrichir une propriété
function enrichProperty(property) {
  const text = `${property.title || ''} ${property.description || ''}`;
  const typeProperty = property.typeProperty;

  // Attributs communs à Logement (Home, Apartment, Studio, Villa)
  if (['Home', 'Apartment', 'Studio', 'Villa'].includes(typeProperty)) {
    const logementAttrs = extractLogementAttributes(text);
    // Ré-extraire si la valeur n'existe pas, est 0, ou semble invalide (> 20 pour chambres/bathrooms)
    if (!property.nbrRooms || property.nbrRooms === 0 || property.nbrRooms > 20) {
      property.nbrRooms = logementAttrs.nbrRooms;
    }
    if (!property.nbrChickens || property.nbrChickens === 0 || property.nbrChickens > 10) {
      property.nbrChickens = logementAttrs.nbrChickens;
    }
    if (!property.nbrBathrooms || property.nbrBathrooms === 0 || property.nbrBathrooms > 20) {
      property.nbrBathrooms = logementAttrs.nbrBathrooms;
    }
    if (!property.nbrToilets || property.nbrToilets === 0 || property.nbrToilets > 20) {
      property.nbrToilets = logementAttrs.nbrToilets;
    }
  }

  // Attributs spécifiques selon le type
  switch (typeProperty) {
    case 'Home':
      Object.assign(property, extractHomeAttributes(text));
      break;
    
    case 'Apartment': {
      const aptAttrs = extractApartmentAttributes(text);
      if (!property.nbrFloorApartment) property.nbrFloorApartment = aptAttrs.nbrFloorApartment;
      if (!property.numeroApartment) property.numeroApartment = aptAttrs.numeroApartment;
      break;
    }
    
    case 'Studio': {
      const studioAttrs = extractStudioAttributes(text);
      if (!property.nbrFloorStudio) property.nbrFloorStudio = studioAttrs.nbrFloorStudio;
      if (!property.numeroStudio) property.numeroStudio = studioAttrs.numeroStudio;
      break;
    }
    
    case 'Villa': {
      const villaAttrs = extractVillaAttributes(text);
      const homeAttrs = extractHomeAttributes(text);
      Object.assign(property, homeAttrs);
      if (!property.nbrPiscine) property.nbrPiscine = villaAttrs.nbrPiscine;
      break;
    }
    
    case 'Room': {
      const roomAttrs = extractRoomAttributes(text);
      // Toujours mettre à jour roomType si on trouve quelque chose
      if (roomAttrs.roomType) {
        property.roomType = roomAttrs.roomType;
      } else if (!property.roomType || property.roomType === 'Standard') {
        // Si on ne trouve rien et qu'il n'y a pas déjà un type, mettre 'Standard'
        // Mais seulement si vraiment rien n'est trouvé
        property.roomType = 'Standard';
      }
      break;
    }
    
    case 'Shop': {
      const shopAttrs = extractShopAttributes(text);
      if (!property.nbrRooms) property.nbrRooms = shopAttrs.nbrRooms;
      if (!property.nbrToilet) property.nbrToilet = shopAttrs.nbrToilet;
      break;
    }
    
    case 'Kiosk': {
      const kioskAttrs = extractKioskAttributes(text);
      if (!property.kioskType) property.kioskType = kioskAttrs.kioskType;
      break;
    }
    
    case 'Building': {
      const buildingAttrs = extractBuildingAttributes(text);
      Object.assign(property, buildingAttrs);
      break;
    }
    
    case 'Desk': {
      const deskAttrs = extractDeskAttributes(text);
      Object.assign(property, deskAttrs);
      break;
    }
  }

  return property;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('🔄 Extraction des attributs spécifiques...\n');
let enrichedCount = 0;

data.properties.forEach((property, index) => {
  const before = JSON.stringify(property);
  enrichProperty(property);
  const after = JSON.stringify(property);
  
  if (before !== after) {
    enrichedCount++;
  }
});

// Sauvegarder
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Extraction terminée !');
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés enrichies: ${enrichedCount}/${data.properties.length}`);
console.log(`💾 Fichier sauvegardé: ${inputFile}`);

