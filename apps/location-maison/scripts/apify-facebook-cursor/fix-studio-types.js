const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('🔍 Recherche des propriétés mal classées (Home/Apartment -> Studio)...\n');

let corrected = 0;
const corrections = [];

data.properties.forEach((property, index) => {
  const text = `${property.title || ''} ${property.description || ''}`.toLowerCase();
  const typeProperty = property.typeProperty;
  
  // Si c'est actuellement Home ou Apartment mais que le texte indique clairement un studio
  if (['Home', 'Apartment'].includes(typeProperty)) {
    // Indicateurs forts que c'est un studio
    const isStudioIndicators = [
      /\b1\s+studio\b/i,  // "1 studio"
      /\bstudio\s+à\s+louer/i,
      /\bstudio\s+en\s+bordure/i,
      /^studio/i,  // Titre commence par "Studio"
      /\bstudio\s+meublé/i,
      /\bstudio\s+bon\s+standing/i
    ];
    
    const isStudio = isStudioIndicators.some(pattern => pattern.test(text));
    
    // Indicateurs que ce n'est PAS un studio (c'est vraiment une maison/appartement)
    const isNotStudioIndicators = [
      /\d+\s+chambres/i && !text.match(/1\s+studio/i),  // "2 chambres", "3 chambres" = maison/appartement (sauf si c'est "1 studio")
      /\d+\s+salons/i,  // Plusieurs salons = maison
      /maison/i,
      /villa/i,
      /duplex/i,
      /immeuble/i,
      /\d+\s+étages?/i && !text.match(/1\s+studio/i)  // Plusieurs étages = maison (sauf si c'est "1 studio")
    ];
    
    const isNotStudio = isNotStudioIndicators.some(pattern => {
      if (typeof pattern === 'object') return pattern.test(text);
      return false;
    });
    
    // Si on détecte que c'est un studio mais pas une maison/appartement
    // Cas spécial : "1 studio" est un indicateur fort même s'il y a "1 chambre" après
    if (isStudio && (!text.match(/\d+\s+chambres/i) || text.match(/1\s+studio/i))) {
      const oldType = property.typeProperty;
      property.typeProperty = 'Studio';
      corrected++;
      corrections.push({
        index,
        title: property.title?.substring(0, 50),
        oldType,
        newType: 'Studio'
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

