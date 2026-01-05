const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Mapping des valeurs minuscules vers PascalCase (clés de TypePropertyEnum)
const typeMapping = {
  'home': 'Home',
  'apartment': 'Apartment',
  'studio': 'Studio',
  'villa': 'Villa',
  'room': 'Room',
  'land': 'Land',
  'shop': 'Shop',
  'kiosk': 'Kiosk',
  'desk': 'Desk',
  'building': 'Building',
  'property': 'Property',
  'logement': 'Logement'
};

console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('🔄 Conversion des typeProperty de minuscules vers PascalCase...\n');
let converted = 0;
let unchanged = 0;
let errors = [];

data.properties.forEach((property, index) => {
  const oldValue = property.typeProperty;
  
  if (!oldValue) {
    unchanged++;
    return;
  }
  
  // Si la valeur est déjà en PascalCase (première lettre majuscule)
  if (oldValue.charAt(0) === oldValue.charAt(0).toUpperCase()) {
    unchanged++;
    return;
  }
  
  // Si la valeur est dans le mapping, la convertir
  if (typeMapping[oldValue]) {
    property.typeProperty = typeMapping[oldValue];
    converted++;
  } else {
    // Valeur non reconnue
    errors.push({ index, value: oldValue, title: property.title?.substring(0, 50) });
  }
});

console.log('✅ Conversion terminée !');
console.log('📊 Statistiques:');
console.log(`   - Converties: ${converted}`);
console.log(`   - Déjà en PascalCase: ${unchanged}`);
console.log(`   - Erreurs (valeurs non reconnues): ${errors.length}`);

if (errors.length > 0) {
  console.log('\n⚠️  Valeurs non reconnues:');
  errors.slice(0, 10).forEach(err => {
    console.log(`   Index ${err.index}: "${err.value}" - ${err.title}`);
  });
  if (errors.length > 10) {
    console.log(`   ... et ${errors.length - 10} autres`);
  }
}

// Sauvegarder le fichier
console.log('\n💾 Sauvegarde du fichier...');
fs.writeFileSync(inputFile, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Fichier sauvegardé: ${inputFile}`);
console.log('\n📊 Résumé:');
console.log(`   Total propriétés: ${data.properties.length}`);
console.log(`   TypeProperty converties: ${converted}`);
console.log(`   TypeProperty déjà correctes: ${unchanged}`);

