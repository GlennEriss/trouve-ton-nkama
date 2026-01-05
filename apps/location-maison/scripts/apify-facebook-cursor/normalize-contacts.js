const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour normaliser un numéro de téléphone vers +2410XXXXXXXX
function normalizePhone(phone) {
  if (!phone || phone.trim() === '') return phone;
  
  // Nettoyer: enlever espaces, points, tirets
  let cleaned = phone.replace(/[\s\.\-]/g, '');
  
  // Normaliser vers +2410XXXXXXXX (13 caractères: +241 + 0 + 8 chiffres)
  if (cleaned.startsWith('+241')) {
    cleaned = cleaned.substring(4); // Enlever +241
    if (cleaned.startsWith('0')) {
      return '+241' + cleaned; // +2410XXXXXXXX
    } else {
      return '+2410' + cleaned; // +2410XXXXXXXX (ajouter le 0 manquant)
    }
  } else if (cleaned.startsWith('241')) {
    cleaned = cleaned.substring(3); // Enlever 241
    if (cleaned.startsWith('0')) {
      return '+241' + cleaned; // +2410XXXXXXXX
    } else {
      return '+2410' + cleaned; // +2410XXXXXXXX
    }
  } else if (cleaned.startsWith('0') && cleaned.length === 9) {
    // Format 0XXXXXXXX (9 chiffres) -> +2410XXXXXXXX
    return '+2410' + cleaned.substring(1);
  } else if (cleaned.match(/^[67]\d{7}$/) && cleaned.length === 8) {
    // Format XXXXXXXX (8 chiffres commençant par 6 ou 7) -> +2410XXXXXXXX
    return '+2410' + cleaned;
  } else if (cleaned.match(/^\d{8,9}$/)) {
    // Format numérique simple (8 ou 9 chiffres)
    if (cleaned.startsWith('0')) {
      return '+2410' + cleaned.substring(1);
    } else if (cleaned.match(/^[67]/)) {
      return '+2410' + cleaned;
    }
  }
  
  // Si on ne peut pas normaliser, retourner tel quel
  return phone;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

let normalizedCount = 0;

// Parcourir toutes les propriétés
console.log('🔍 Normalisation des contacts...');
data.properties.forEach((property, index) => {
  if (property.contact && property.contact.trim() !== '') {
    const normalized = normalizePhone(property.contact);
    if (normalized !== property.contact) {
      property.contact = normalized;
      normalizedCount++;
    }
  }
});

// Sauvegarder le fichier mis à jour
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Fichier mis à jour avec succès !');
console.log(`📊 Contacts normalisés: ${normalizedCount}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

