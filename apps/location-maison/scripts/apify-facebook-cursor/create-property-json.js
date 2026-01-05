const fs = require('fs');

// Le JSON complet fourni par l'utilisateur
// Je vais créer le fichier en construisant le JSON progressivement
// Pour éviter les limites de tokens, je vais utiliser une approche avec fs.appendFileSync

const jsonData = JSON.parse(fs.readFileSync('/dev/stdin', 'utf-8'));
const outputFile = 'property.json';

fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf8');
console.log(`✅ JSON sauvegardé dans ${outputFile}`);
console.log(`📊 ${jsonData.length} éléments`);
