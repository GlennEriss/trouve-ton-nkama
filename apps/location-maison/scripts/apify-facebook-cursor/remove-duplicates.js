const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour normaliser un texte (pour comparaison)
function normalizeText(text) {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Fonction pour créer une signature unique d'une propriété
function createSignature(property) {
  // Utiliser plusieurs critères pour identifier les doublons
  const title = normalizeText(property.title || '');
  const description = normalizeText(property.description || '').substring(0, 200); // Premiers 200 caractères
  const contact = normalizeText(property.contact || '');
  const price = property.price || 0;
  
  // Si on a des images, utiliser la première URL d'image (le plus fiable)
  const firstImageUrl = property.images?.[0]?.fileURL || '';
  // Extraire l'ID de l'image depuis l'URL (ex: .../608893390_122115134733155484_.../ -> 122115134733155484)
  let imageId = '';
  if (firstImageUrl) {
    const urlParts = firstImageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';
    // Extraire les IDs numériques de l'URL
    const idMatch = filename.match(/\d{12,}/);
    if (idMatch) {
      imageId = idMatch[0];
    } else {
      // Fallback: utiliser le nom du fichier
      imageId = filename.split('?')[0];
    }
  }
  
  // Créer une signature basée sur plusieurs critères
  // Priorité 1: ID d'image (le plus fiable pour détecter les doublons)
  if (imageId && imageId.length > 10) {
    return `image:${imageId}`;
  }
  
  // Priorité 2: Titre + contact + prix (très fiable - utilisé aussi même si on a une image)
  if (title && title.length > 10 && contact && price > 0) {
    return `title-contact-price:${title}:${contact}:${price}`;
  }
  
  // Priorité 3: Titre + contact (fiable)
  if (title && title.length > 15 && contact) {
    return `title-contact:${title}:${contact}`;
  }
  
  // Priorité 4: Titre + prix (fiable)
  if (title && title.length > 15 && price > 0) {
    return `title-price:${title}:${price}`;
  }
  
  // Priorité 5: Titre + début de description (si titre assez unique)
  if (title && title.length > 20 && description.length > 30) {
    return `title-desc:${title}:${description.substring(0, 100)}`;
  }
  
  // Ne pas utiliser uniquement le titre car plusieurs annonces peuvent avoir le même titre
  // Fallback: utiliser l'index (ne sera pas considéré comme doublon)
  return null;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log(`📊 Propriétés avant déduplication: ${data.properties.length}`);

// Détecter les doublons
const seen = new Map();
const uniqueProperties = [];
const duplicates = [];
const duplicateIndices = new Set();

data.properties.forEach((property, index) => {
  const signature = createSignature(property);
  
  // Si pas de signature (fallback), toujours garder
  if (!signature) {
    uniqueProperties.push(property);
    return;
  }
  
  if (seen.has(signature)) {
    // C'est un doublon
    duplicates.push({
      index: index,
      signature: signature,
      title: property.title?.substring(0, 50) || 'Sans titre',
      originalIndex: seen.get(signature)
    });
    duplicateIndices.add(index);
  } else {
    // Première occurrence
    seen.set(signature, index);
    uniqueProperties.push(property);
  }
});

console.log(`📊 Doublons détectés: ${duplicates.length}`);
console.log(`📊 Propriétés uniques: ${uniqueProperties.length}`);

if (duplicates.length > 0) {
  console.log('\nExemples de doublons (premiers 10):');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  Index ${dup.index}: "${dup.title}" (doublon de l'index ${dup.originalIndex})`);
  });
}

// Mettre à jour les données
data.properties = uniqueProperties;
data.metadata.propertiesExtracted = uniqueProperties.length;

// Sauvegarder le fichier
console.log('\n💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Déduplication terminée avec succès !');
console.log(`📊 Résultats:`);
console.log(`   - Propriétés avant: ${data.properties.length + duplicates.length}`);
console.log(`   - Doublons supprimés: ${duplicates.length}`);
console.log(`   - Propriétés après: ${uniqueProperties.length}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

