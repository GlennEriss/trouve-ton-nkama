const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Fonction améliorée pour extraire le prix depuis le texte
function extractPrice(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Patterns pour trouver le prix (plus complets)
  const patterns = [
    /prix[:\s]*(\d+)[\.\s]*(\d{3})?\s*(?:fcfa|fcf|f|fc|franc)?/gi,  // Prix: 125.000 ou Prix 125000
    /prix[:\s]*(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,  // Prix 250 mille
    /loyer[:\s]*(\d+)[\.\s]*(\d{3})?\s*(?:fcfa|fcf|f|fc|franc)?/gi,  // Loyer: 200.000
    /loyer[:\s]*(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,  // Loyer 250 mille
    /(\d+)[\.\s]*(\d{3})\s*(?:fcfa|fcf|f|fc|franc)/gi,  // 125.000 FCFA
    /(\d+)\s*(?:mill|mille|mil)\s*(?:fcfa|fcf|f|fc|franc)?/gi,  // 250 mille
    /(\d+)\s*(?:000\s*)?fcfa/gi,  // 125000 FCFA ou 125 000 FCFA
    /(\d+)\s*(?:millions?|mio)/gi  // Millions
  ];
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      let priceStr = '';
      
      // Si le pattern a capturé deux groupes (ex: "125.000")
      if (match[2]) {
        priceStr = match[1] + match[2]; // "125" + "000" = "125000"
      } else if (match[1]) {
        priceStr = match[1];
      } else {
        priceStr = match[0].replace(/[^\d]/g, '');
      }
      
      let price = parseInt(priceStr);
      
      if (price > 0) {
        // Si le prix est < 1000 et qu'on est dans un contexte de location/vente
        // et qu'il n'y a pas de mention explicite de "millions", c'est probablement en milliers
        if (price < 1000) {
          const context = match[0].toLowerCase();
          const hasMillion = lowerText.includes('million') || lowerText.includes('millions');
          const hasThousand = context.includes('mill') || context.includes('mille') || context.includes('mil');
          
          // Si c'est un prix de location/vente et pas des millions, multiplier par 1000
          if (!hasMillion && (hasThousand || lowerText.includes('prix') || lowerText.includes('loyer'))) {
            price = price * 1000;
          }
        }
        
        // Si le prix est entre 100 et 9999, vérifier le contexte
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

// Fonction pour extraire le numéro de téléphone (réutilisée depuis enhance-contacts.js)
function extractAndFormatPhone(text) {
  if (!text) return null;
  
  const phonePatterns = [
    /\b\+241\s*0?[67]\d{7}\b/g,
    /\b241\s*0?[67]\d{7}\b/g,
    /\b0[67]\d{7}\b/g,
    /\b[67]\d{7}\b/g,
    /\b0?[67]\d{1}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}[\s\.\-]?\d{2}\b/g
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
      } else if (phone.match(/^[67]\d{7}$/) && phone.length === 8) {
        return '+2410' + phone;
      }
    }
  }
  
  return null;
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

let priceUpdatedCount = 0;
let priceCorrectedCount = 0;
let contactUpdatedCount = 0;

// Parcourir toutes les propriétés
console.log('🔍 Correction des prix et contacts depuis les descriptions...');
data.properties.forEach((property, index) => {
  const description = property.description || '';
  const title = property.title || '';
  const combinedText = title + ' ' + description;
  
  // Extraire et corriger le prix
  const extractedPrice = extractPrice(combinedText);
  if (extractedPrice !== null) {
    const currentPrice = property.price || 0;
    if (currentPrice === 0 || (currentPrice < 1000 && extractedPrice >= 1000)) {
      property.price = extractedPrice;
      priceUpdatedCount++;
    } else if (currentPrice < 1000 && extractedPrice >= currentPrice * 100) {
      property.price = extractedPrice;
      priceCorrectedCount++;
    }
  }
  
  // Extraire et corriger le contact si vide
  if (!property.contact || property.contact.trim() === '') {
    const phone = extractAndFormatPhone(combinedText);
    if (phone) {
      property.contact = phone;
      contactUpdatedCount++;
    }
  }
});

// Sauvegarder le fichier mis à jour
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Fichier mis à jour avec succès !');
console.log(`📊 Statistiques:`);
console.log(`   - Prix mis à jour: ${priceUpdatedCount}`);
console.log(`   - Prix corrigés: ${priceCorrectedCount}`);
console.log(`   - Contacts ajoutés: ${contactUpdatedCount}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

