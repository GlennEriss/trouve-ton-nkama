const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour normaliser un texte
function normalizeText(text) {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log(`📊 Propriétés avant déduplication: ${data.properties.length}`);

// Détecter les doublons avec plusieurs stratégies
const seen = new Map();
const uniqueProperties = [];
const duplicates = [];

data.properties.forEach((property, index) => {
  const title = normalizeText(property.title || '');
  const price = property.price || 0;
  const contact = normalizeText(property.contact || '');
  const firstImageUrl = property.images?.[0]?.fileURL || '';
  
  let signature = null;
  let signatureType = '';
  
  // Stratégie 1: Titre + Prix + Contact (PRIORITÉ ABSOLUE - le plus fiable pour détecter les doublons)
  if (title.length > 10 && price > 0 && contact) {
    signature = `tcp:${title}|${price}|${contact}`;
    signatureType = 'titre+prix+contact';
  }
  // Stratégie 2: Titre + Contact (si pas de prix mais contact présent)
  else if (title.length > 15 && contact) {
    signature = `tc:${title}|${contact}`;
    signatureType = 'titre+contact';
  }
  // Stratégie 3: Titre + Prix (si pas de contact mais prix présent)
  else if (title.length > 15 && price > 0) {
    signature = `tp:${title}|${price}`;
    signatureType = 'titre+prix';
  }
  // Stratégie 4: ID de l'image (seulement si pas de titre+prix+contact)
  else if (firstImageUrl) {
    // Extraire l'ID de l'image (ex: .../608893390_122115134733155484_... -> 122115134733155484)
    const urlParts = firstImageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || '';
    const idMatch = filename.match(/\d{12,}/);
    if (idMatch) {
      signature = `img:${idMatch[0]}`;
      signatureType = 'image';
    } else {
      // Utiliser le nom de fichier sans paramètres
      const fileId = filename.split('?')[0].split('_')[0];
      if (fileId && fileId.length > 10) {
        signature = `img:${fileId}`;
        signatureType = 'image';
      }
    }
  }
  // Stratégie 3: Titre + Contact (si pas de prix)
  else if (title.length > 15 && contact) {
    signature = `tc:${title}|${contact}`;
    signatureType = 'titre+contact';
  }
  // Stratégie 4: Titre + Prix (si pas de contact)
  else if (title.length > 15 && price > 0) {
    signature = `tp:${title}|${price}`;
    signatureType = 'titre+prix';
  }
  
  if (signature && seen.has(signature)) {
    // C'est un doublon
    duplicates.push({
      index: index,
      type: signatureType,
      title: property.title?.substring(0, 50) || 'Sans titre',
      originalIndex: seen.get(signature)
    });
  } else {
    // Première occurrence ou pas de signature (on garde quand même)
    if (signature) {
      seen.set(signature, index);
    }
    uniqueProperties.push(property);
  }
});

console.log(`📊 Doublons détectés: ${duplicates.length}`);
console.log(`📊 Propriétés uniques: ${uniqueProperties.length}`);

if (duplicates.length > 0) {
  console.log('\nExemples de doublons (premiers 10):');
  duplicates.slice(0, 10).forEach(dup => {
    console.log(`  Index ${dup.index}: "${dup.title}" (${dup.type}, doublon de l'index ${dup.originalIndex})`);
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

