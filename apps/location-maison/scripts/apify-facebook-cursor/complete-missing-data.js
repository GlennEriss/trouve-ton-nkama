const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction pour extraire le prix (réutilisée depuis fix-prices.js)
function extractPrice(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  const patterns = [
    /prix[:\s]*(\d+)[\.\s]*(\d{3})?\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /prix[:\s]*(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /loyer[:\s]*(\d+)[\.\s]*(\d{3})?\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /loyer[:\s]*(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /(\d+)[\.\s]*(\d{3})\s*(?:fcfa|fcf|f|fc|franc)/gi,
    /(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,
    /(\d+)\s*(?:000\s*)?fcfa/gi,
    /(\d+)\s*(?:millions?|mio)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      let priceStr = '';
      
      if (match[2]) {
        priceStr = match[1] + match[2];
      } else if (match[1]) {
        priceStr = match[1];
      } else {
        priceStr = match[0].replace(/[^\d]/g, '');
      }
      
      let price = parseInt(priceStr);
      
      if (price > 0) {
        if (price < 1000) {
          const context = match[0].toLowerCase();
          const hasMillion = lowerText.includes('million') || lowerText.includes('millions');
          const hasThousand = context.includes('mill') || context.includes('mille') || context.includes('mil');
          
          if (!hasMillion && (hasThousand || lowerText.includes('prix') || lowerText.includes('loyer'))) {
            price = price * 1000;
          }
        }
        
        if (price >= 100 && price < 10000) {
          const context = match[0].toLowerCase();
          if (context.includes('mill') || context.includes('mille') || context.includes('mil')) {
            price = price * 1000;
          }
        }
        
        return price;
      }
    }
  }
  
  return null;
}

// Fonction pour extraire le contact (réutilisée depuis enhance-contacts.js)
function extractAndFormatPhone(text) {
  if (!text) return null;
  
  const phonePatterns = [
    /\b\+241\s*0?[67]\d{7}\b/g,
    /\b241\s*0?[67]\d{7}\b/g,
    /\b0[67]\d{1}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{1,2}\b/g,  // 06 56 95 34 ou 077 27 52 65
    /\b0[67]\d{7}\b/g,  // 06569534 (format compact)
    /\b0[67]\s*\d{1}\s*\d{2}\s*\d{2}\s*\d{2}\b/g,  // 06 56 95 34 (avec espaces)
    /\b0[67][\d\s\.\-]{7,12}\b/g,  // Format flexible
    /\b[67]\d{7}\b/g
  ];
  
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      let phone = matches[0];
      phone = phone.replace(/[\s\.\-]/g, '');
      
      if (phone.startsWith('+241')) {
        phone = phone.substring(4);
        return phone.startsWith('0') ? '+241' + phone : '+2410' + phone;
      } else if (phone.startsWith('241')) {
        phone = phone.substring(3);
        return phone.startsWith('0') ? '+241' + phone : '+2410' + phone;
      } else if (phone.startsWith('0') && phone.length === 9) {
        return '+241' + phone.substring(1);
      } else if (phone.startsWith('0') && phone.length === 8 && phone.match(/^0[67]\d{6}$/)) {
        // Numéro à 8 chiffres commençant par 06 ou 07 (ex: 06569534)
        return '+2410' + phone.substring(1);
      } else if (phone.match(/^[67]\d{7}$/) && phone.length === 8) {
        return '+2410' + phone;
      }
    }
  }
  
  return null;
}

// Fonction pour normaliser un contact
function normalizePhone(phone) {
  if (!phone || phone.trim() === '') return phone;
  
  let cleaned = phone.replace(/[\s\.\-]/g, '');
  
  if (cleaned.startsWith('+241')) {
    cleaned = cleaned.substring(4);
    return cleaned.startsWith('0') ? '+241' + cleaned : '+2410' + cleaned;
  } else if (cleaned.startsWith('241')) {
    cleaned = cleaned.substring(3);
    return cleaned.startsWith('0') ? '+241' + cleaned : '+2410' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 9) {
    return '+2410' + cleaned.substring(1);
  } else if (cleaned.match(/^[67]\d{7}$/) && cleaned.length === 8) {
    return '+2410' + cleaned;
  }
  
  return phone;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

let priceAddedCount = 0;
let contactAddedCount = 0;
let contactNormalizedCount = 0;

// Parcourir toutes les propriétés
console.log('🔍 Extraction des données manquantes depuis les descriptions...');
data.properties.forEach((property, index) => {
  const description = property.description || '';
  const title = property.title || '';
  const combinedText = title + ' ' + description;
  
  // Extraire le prix si manquant
  if (!property.price || property.price === 0) {
    const extractedPrice = extractPrice(combinedText);
    if (extractedPrice !== null && extractedPrice > 0) {
      property.price = extractedPrice;
      priceAddedCount++;
    }
  }
  
  // Extraire le contact si manquant ou vide
  if (!property.contact || property.contact.trim() === '') {
    const phone = extractAndFormatPhone(combinedText);
    if (phone) {
      property.contact = phone;
      contactAddedCount++;
    }
  } else {
    // Normaliser le contact existant
    const normalized = normalizePhone(property.contact);
    if (normalized !== property.contact) {
      property.contact = normalized;
      contactNormalizedCount++;
    }
  }
});

// Sauvegarder le fichier mis à jour
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Fichier mis à jour avec succès !');
console.log(`📊 Statistiques:`);
console.log(`   - Prix ajoutés: ${priceAddedCount}`);
console.log(`   - Contacts ajoutés: ${contactAddedCount}`);
console.log(`   - Contacts normalisés: ${contactNormalizedCount}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

