const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

function normalizeText(text) {
  return text ? text.toLowerCase().replace(/\s+/g, ' ').trim() : '';
}

function determineCorrectType(property) {
  const text = normalizeText(`${property.title || ''} ${property.description || ''}`);
  const currentType = property.typeProperty;

  // Si c'est déjà Room et que ça semble correct, garder Room
  if (currentType === 'Room') {
    // Si c'est une chambre individuelle avec salon/cuisine, c'est Room
    if (text.includes('chambre') && (text.includes('salon') || text.includes('cuisine'))) {
      return 'Room';
    }
    // Si c'est une chambre américaine ou individuelle, c'est Room
    if (text.includes('chambre américaine') || text.includes('chambre individuelle')) {
      return 'Room';
    }
    // Si c'est une seule chambre avec salon/cuisine, c'est Room
    if (text.match(/\b1\s+chambre\b/) && (text.includes('salon') || text.includes('cuisine'))) {
      return 'Room';
    }
  }

  // Si c'est Home mais que ça ressemble à une Room
  if (currentType === 'Home') {
    // Si le titre dit "Room" ou "chambre"
    if (text.includes('room') || (text.includes('chambre') && !text.match(/\b[2-9]\s+chambres?\b/))) {
      // Si c'est une seule chambre avec salon/cuisine, c'est Room
      if (text.match(/\b1\s+chambre\b/) || (text.includes('chambre') && text.includes('salon'))) {
        return 'Room';
      }
    }
    // Si c'est "2 chambres salon douche wc" dans une description courte, c'est Room (collocation)
    if (text.match(/\b2\s+chambres?\b.*salon.*douche.*wc/) && text.length < 200) {
      return 'Room';
    }
  }

  // Si c'est Studio mais que ça a plusieurs chambres, c'est Apartment
  if (currentType === 'Studio') {
    if (text.match(/\b[2-9]\s+chambres?\b/) && text.includes('salon')) {
      return 'Apartment';
    }
  }

  // Si c'est Apartment mais que c'est un studio (1 chambre, salon, cuisine)
  if (currentType === 'Apartment') {
    if (text.match(/\b1\s+chambre\b/) && text.includes('studio')) {
      return 'Studio';
    }
    // Si c'est une chambre individuelle, c'est Room
    if (text.includes('chambre individuelle') || text.includes('chambre américaine')) {
      return 'Room';
    }
  }

  // Si c'est Home mais que c'est une villa
  if (currentType === 'Home') {
    if (text.includes('villa') || text.includes('duplex')) {
      return 'Villa';
    }
    // Si c'est un local commercial
    if (text.includes('local commercial') || text.includes('fond de commerce') || text.includes('boutique') || text.includes('locaux commerciaux')) {
      return 'Shop';
    }
  }

  return currentType; // Garder le type actuel si aucune correction nécessaire
}

function cleanAttributes(property, correctType) {
  // Supprimer tous les attributs spécifiques d'abord
  delete property.nbrFloors;
  delete property.nbrGarages;
  delete property.nbrLivingRoom;
  delete property.nbrPiscine;
  delete property.nbrFloorApartment;
  delete property.numeroApartment;
  delete property.nbrFloorStudio;
  delete property.numeroStudio;
  delete property.roomType;

  const text = normalizeText(`${property.title || ''} ${property.description || ''}`);

  // Ajouter les attributs selon le type
  if (correctType === 'Room') {
    if (text.includes('chambre américaine')) {
      property.roomType = 'Américaine';
    } else if (text.includes('chambre individuelle')) {
      property.roomType = 'Individuelle';
    } else {
      property.roomType = 'Standard';
    }
  } else if (correctType === 'Home') {
    // Extraire nbrFloors
    const floorsMatch = text.match(/(\d+)(?:er|e|ème)?\s*étage/i);
    if (floorsMatch) {
      property.nbrFloors = parseInt(floorsMatch[1], 10);
    } else {
      property.nbrFloors = 0;
    }
    // Extraire nbrGarages
    const garagesMatch = text.match(/(\d+)\s*(?:garages?|parking)/i);
    if (garagesMatch) {
      property.nbrGarages = parseInt(garagesMatch[1], 10);
    } else if (text.includes('garage') || text.includes('parking')) {
      property.nbrGarages = 1;
    } else {
      property.nbrGarages = 0;
    }
    // Extraire nbrLivingRoom
    const livingMatch = text.match(/(\d+)\s*salons?/i);
    if (livingMatch) {
      property.nbrLivingRoom = parseInt(livingMatch[1], 10);
    } else if (text.includes('salon')) {
      property.nbrLivingRoom = 1;
    } else {
      property.nbrLivingRoom = 0;
    }
    // Extraire nbrPiscine
    property.nbrPiscine = text.includes('piscine') ? 1 : 0;
  } else if (correctType === 'Apartment') {
    const floorMatch = text.match(/(\d+)(?:er|e|ème)?\s*étage/i);
    if (floorMatch) {
      property.nbrFloorApartment = parseInt(floorMatch[1], 10);
    } else {
      property.nbrFloorApartment = 0;
    }
    const numeroMatch = text.match(/(?:appartement|numéro)\s*([a-z0-9]+)/i);
    if (numeroMatch && numeroMatch[1]) {
      property.numeroApartment = numeroMatch[1].toUpperCase();
    } else {
      property.numeroApartment = '';
    }
  } else if (correctType === 'Studio') {
    const floorMatch = text.match(/(\d+)(?:er|e|ème)?\s*étage/i);
    if (floorMatch) {
      property.nbrFloorStudio = parseInt(floorMatch[1], 10);
    } else {
      property.nbrFloorStudio = 0;
    }
    const numeroMatch = text.match(/(?:studio|numéro)\s*([a-z0-9]+)/i);
    if (numeroMatch && numeroMatch[1]) {
      property.numeroStudio = numeroMatch[1].toUpperCase();
    } else {
      property.numeroStudio = '';
    }
  } else if (correctType === 'Villa') {
    property.nbrPiscine = text.includes('piscine') ? 1 : 0;
  }
}

console.log('📖 Lecture du fichier...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const data = JSON.parse(rawData);

console.log('🔍 Analyse et correction des types...');
const corrections = [];
let correctedCount = 0;

data.properties = data.properties.map((property, index) => {
  const originalType = property.typeProperty;
  const correctType = determineCorrectType(property);
  
  if (originalType !== correctType) {
    corrections.push({
      index: index + 1,
      title: property.title?.substring(0, 60) || 'Sans titre',
      originalType,
      correctType,
      reason: `${originalType} → ${correctType}`
    });
    property.typeProperty = correctType;
    correctedCount++;
  }
  
  // Nettoyer et réattribuer les attributs selon le type correct
  cleanAttributes(property, correctType);
  
  return property;
});

fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Correction terminée !');
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés corrigées: ${correctedCount}/${data.properties.length}`);

if (corrections.length > 0) {
  console.log('\n📋 Détail des corrections:\n');
  corrections.forEach((correction, i) => {
    console.log(`   ${i + 1}. "${correction.title}"`);
    console.log(`      ${correction.reason}`);
  });
}

// Statistiques finales
const finalStats = data.properties.reduce((acc, prop) => {
  acc[prop.typeProperty] = (acc[prop.typeProperty] || 0) + 1;
  return acc;
}, {});

console.log('\n📊 Statistiques finales après correction:\n');
Object.entries(finalStats).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  - ${type}: ${count}`);
});
console.log(`\nTotal: ${data.properties.length}\n`);

