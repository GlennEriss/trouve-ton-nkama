const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('🔍 Analyse et correction des incohérences...\n');

let corrections = [];
let totalCorrected = 0;

data.properties.forEach((property, index) => {
  const text = `${property.title || ''} ${property.description || ''}`.toLowerCase();
  const originalType = property.typeProperty;
  let newType = originalType;
  let reason = '';

  // Règles de détection et correction
  
  // 1. Détecter les Studios
  if (text.match(/\b1\s+studio\b/i) || 
      text.match(/^studio/i) ||
      (text.match(/\bstudio\b/i) && !text.match(/\d+\s+chambres/i))) {
    if (originalType !== 'Studio') {
      newType = 'Studio';
      reason = 'Contient "studio"';
    }
  }
  
  // 2. Détecter les Rooms (chambres individuelles)
  else if (text.match(/chambre\s+(americaine|américaine|simple|double|individuelle)/i) ||
           text.match(/\b(une|un)\s+chambre\b/i) ||
           (text.match(/\bchambre\b/i) && 
            !text.match(/\d+\s+chambres/i) && 
            !text.match(/\d+\s+salons/i) &&
            !text.match(/maison/i) &&
            !text.match(/villa/i) &&
            !text.match(/duplex/i))) {
    if (originalType !== 'Room') {
      newType = 'Room';
      reason = 'Chambre individuelle';
    }
  }
  
  // 3. Détecter les Villas
  else if (text.match(/\bvilla\b/i) || text.match(/\bduplex\b/i)) {
    if (originalType !== 'Villa') {
      newType = 'Villa';
      reason = 'Contient "villa" ou "duplex"';
    }
  }
  
  // 4. Détecter les Apartments (appartements)
  else if (text.match(/\bappartement\b/i) || text.match(/\bapt\b/i)) {
    if (originalType !== 'Apartment' && originalType !== 'Studio') {
      newType = 'Apartment';
      reason = 'Contient "appartement"';
    }
  }
  
  // 5. Si plusieurs chambres ET plusieurs salons = Home (maison)
  else if ((text.match(/\d+\s+chambres/i) || text.match(/\d+\s+chambre/i)) &&
           (text.match(/\d+\s+salons/i) || text.match(/\d+\s+salon/i))) {
    if (originalType === 'Room' || originalType === 'Studio') {
      newType = 'Home';
      reason = 'Plusieurs chambres et salons = maison';
    }
  }
  
  // 6. Si plusieurs chambres mais pas de salon explicite = Home par défaut
  else if (text.match(/\d+\s+chambres/i) && !text.match(/studio/i) && !text.match(/chambre\s+(americaine|simple|double)/i)) {
    if (originalType === 'Room') {
      newType = 'Home';
      reason = 'Plusieurs chambres = maison';
    }
  }
  
  // 7. Si Room mais contient plusieurs chambres/salons, changer en Home
  if (originalType === 'Room' && (text.match(/\d+\s+chambres/i) || text.match(/\d+\s+salons/i))) {
    newType = 'Home';
    reason = 'Room avec plusieurs chambres/salons → Home';
  }
  
  // 8. Si Studio mais contient plusieurs chambres, changer en Home
  if (originalType === 'Studio' && text.match(/\d+\s+chambres/i) && !text.match(/1\s+chambre/i)) {
    newType = 'Home';
    reason = 'Studio avec plusieurs chambres → Home';
  }

  // Appliquer la correction si nécessaire
  if (newType !== originalType) {
    property.typeProperty = newType;
    corrections.push({
      index,
      title: property.title?.substring(0, 50),
      oldType: originalType,
      newType: newType,
      reason: reason
    });
    totalCorrected++;
  }
});

console.log(`✅ Correction terminée !`);
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés corrigées: ${totalCorrected}/${data.properties.length}`);

if (corrections.length > 0) {
  console.log(`\n📋 Détail des corrections:`);
  // Grouper par type de correction
  const byType = {};
  corrections.forEach(corr => {
    const key = `${corr.oldType} → ${corr.newType}`;
    if (!byType[key]) byType[key] = [];
    byType[key].push(corr);
  });
  
  Object.entries(byType).forEach(([typeChange, items]) => {
    console.log(`\n   ${typeChange} (${items.length} propriétés):`);
    items.slice(0, 10).forEach((corr, i) => {
      console.log(`     ${i+1}. "${corr.title}"`);
      console.log(`        Raison: ${corr.reason}`);
    });
    if (items.length > 10) {
      console.log(`     ... et ${items.length - 10} autres`);
    }
  });
}

// Sauvegarder
console.log('\n💾 Sauvegarde du fichier...');
fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Fichier sauvegardé: ${inputFile}`);

