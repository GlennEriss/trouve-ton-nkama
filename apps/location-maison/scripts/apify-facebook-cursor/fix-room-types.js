const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('🔍 Recherche des propriétés mal classées (Home/Studio/Apartment -> Room)...\n');

let corrected = 0;
const corrections = [];

data.properties.forEach((property, index) => {
  const text = `${property.title || ''} ${property.description || ''}`.toLowerCase();
  const typeProperty = property.typeProperty;
  
  // Si c'est actuellement Home, Studio, ou Apartment mais que le texte indique clairement une chambre
  if (['Home', 'Studio', 'Apartment'].includes(typeProperty)) {
    // Indicateurs forts que c'est une chambre (Room)
    const isRoomIndicators = [
      /chambre\s+(americaine|américaine)/i,
      /chambre\s+(simple|double|individuelle)/i,
      /(une|un)\s+chambre/i,
      /^room\s+-/i,  // Titre commence par "Room -"
      /\broom\s+à\s+louer/i
    ];
    
    const isRoom = isRoomIndicators.some(pattern => pattern.test(text));
    
    // Indicateurs que ce n'est PAS une chambre (c'est vraiment une maison/appartement)
    const isNotRoomIndicators = [
      /\d+\s+chambres/i,  // "2 chambres", "3 chambres" = maison/appartement
      /maison/i,
      /appartement/i,
      /villa/i,
      /duplex/i,
      /immeuble/i,
      /\d+\s+salons/i,  // Plusieurs salons = maison
      /étages?/i && /\d+\s+étages?/i  // Plusieurs étages = maison
    ];
    
    const isNotRoom = isNotRoomIndicators.some(pattern => {
      if (typeof pattern === 'object') return pattern.test(text);
      return false;
    });
    
    // Si on détecte que c'est une chambre mais pas une maison/appartement
    if (isRoom && !text.match(/\d+\s+chambres/i) && !text.match(/\d+\s+salons/i)) {
      const oldType = property.typeProperty;
      property.typeProperty = 'Room';
      corrected++;
      corrections.push({
        index,
        title: property.title?.substring(0, 50),
        oldType,
        newType: 'Room'
      });
    }
  }
});

console.log(`✅ Correction terminée !`);
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés corrigées: ${corrected}`);

if (corrections.length > 0) {
  console.log(`\n📋 Propriétés corrigées:`);
  corrections.forEach((corr, i) => {
    console.log(`   ${i+1}. "${corr.title}"`);
    console.log(`      ${corr.oldType} → ${corr.newType}`);
  });
}

// Sauvegarder
console.log('\n💾 Sauvegarde du fichier...');
fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Fichier sauvegardé: ${inputFile}`);

