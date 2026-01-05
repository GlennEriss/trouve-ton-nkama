const fs = require('fs');
// Le JSON fourni par l'utilisateur sera lu depuis stdin ou depuis un fichier
const data = JSON.parse(fs.readFileSync(0, 'utf-8'));
fs.writeFileSync('property.json', JSON.stringify(data, null, 2), 'utf8');
console.log('JSON sauvegardé,', data.length, 'éléments');
