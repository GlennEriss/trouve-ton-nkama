const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour extraire et formater le numéro de téléphone
function extractAndFormatPhone(text) {
  if (!text) return null;
  
  // Patterns pour capturer les numéros gabonais
  // Formats: 074275857, 0651234567, +241074275857, 241074275857, 06 56 95 34, 077 27 52 65, etc.
  // Les numéros gabonais ont 9 chiffres et commencent par 0 suivi de 6 ou 7
  // Format: 0 + (6 ou 7) + 7 chiffres = 9 chiffres au total
  const phonePatterns = [
    /\b\+241\s*0?[67]\d{7}\b/g,  // +241 074275857 ou +24174275857
    /\b241\s*0?[67]\d{7}\b/g,    // 241 074275857 ou 24174275857
    /\b0[67]\d{1}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{1,2}\b/g,  // 077 27 52 65 (avec séparateurs)
    /\b0[67]\d{7}\b/g,           // 074275857 (format compact: 0 + 6/7 + 7 chiffres)
    /\b0[67][\d\s\.\-]{8,12}\b/g,  // 077 27 52 65 (format flexible avec espaces)
    /\b[67]\d{7}\b/g             // 74275857 (sans le 0 initial, 8 chiffres)
  ];
  
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Prendre le premier match
      let phone = matches[0];
      
      // Nettoyer: enlever espaces, points, tirets
      phone = phone.replace(/[\s\.\-]/g, '');
      
      // Normaliser le format vers +241XXXXXXXX (9 chiffres après +241)
      if (phone.startsWith('+241')) {
        // Déjà au bon format: +241XXXXXXXX ou +2410XXXXXXXX
        if (phone.length === 13) {
          return phone; // +241074275857
        } else if (phone.length === 12) {
          return phone.substring(0, 4) + '0' + phone.substring(4); // +24174275857 -> +241074275857
        }
      } else if (phone.startsWith('241')) {
        // Format 241XXXXXXXX -> +241XXXXXXXX
        if (phone.length === 12) {
          return '+' + phone; // +241074275857
        } else if (phone.length === 11) {
          return '+2410' + phone.substring(3); // +241074275857
        }
      } else if (phone.startsWith('0') && phone.length === 9) {
        // Format 0XXXXXXXX -> +241XXXXXXXX (9 chiffres: 0 + 7 chiffres après)
        return '+241' + phone.substring(1);
      } else if (phone.match(/^[67]\d{7}$/) && phone.length === 8) {
        // Format XXXXXXXX (8 chiffres commençant par 6 ou 7) -> +2410XXXXXXXX
        return '+2410' + phone;
      }
    }
  }
  
  return null;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

let updatedCount = 0;
let alreadyHasContactCount = 0;

// Parcourir toutes les propriétés
console.log('🔍 Extraction des contacts depuis les descriptions...');
data.properties.forEach((property, index) => {
  // Si le contact est déjà rempli, on le garde
  if (property.contact && property.contact.trim() !== '') {
    alreadyHasContactCount++;
    return;
  }
  
  // Extraire le contact depuis la description
  const description = property.description || '';
  const title = property.title || '';
  const combinedText = title + ' ' + description;
  
  const phone = extractAndFormatPhone(combinedText);
  
  if (phone) {
    property.contact = phone;
    updatedCount++;
  }
});

// Sauvegarder le fichier mis à jour
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Fichier mis à jour avec succès !');
console.log(`📊 Statistiques:`);
console.log(`   - Contacts mis à jour: ${updatedCount}`);
console.log(`   - Contacts déjà présents: ${alreadyHasContactCount}`);
console.log(`   - Total propriétés: ${data.properties.length}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

