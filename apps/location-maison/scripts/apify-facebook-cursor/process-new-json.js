const fs = require('fs');
const path = require('path');

// Si un fichier est fourni en argument, le copier vers property.json
const sourceFile = process.argv[2];

if (sourceFile && fs.existsSync(sourceFile)) {
  const data = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  const outputFile = path.join(__dirname, 'property.json');
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ JSON copié depuis ${sourceFile} vers property.json`);
  console.log(`📊 ${data.length} éléments sauvegardés`);
} else {
  console.log('Usage: node process-new-json.js <fichier-source.json>');
  console.log('Ou: cat votre-json.json | node process-new-json.js');
  process.exit(1);
}
