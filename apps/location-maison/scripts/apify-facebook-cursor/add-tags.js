const fs = require('fs');
const path = require('path');

// Fichier d'entrée et de sortie
const inputFile = path.join(__dirname, 'properties-extracted-combined.json');
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Liste des tags disponibles (extraits de index.ts)
const availableTags = [
  'Travail',
  'Famille',
  'Couple',
  'Villa',
  'Sous barrière',
  'Meublé',
  'Centre-ville',
  'Vacances',
  'Nature',
  'Montagne',
  'Piscine',
  'Animaux admis',
  'Commerces proches',
  'Transport proche',
  'Parking',
  'Wi-Fi',
  'Sécurisé',
  'Vélo',
  'Activités sportives',
  'Adapté aux enfants',
  'Accessible handicapés',
  'Étudiant',
  'Calme et tranquillité',
  'Proche de la plage',
  'Duplex',
  'Boutique',
  'Balcon',
  'Terrasse',
  'Collocation',
  'Garage',
  'Court séjour',
  'Propriétaire',
  'Agence'
];

// Fonction pour normaliser le texte
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^\w\s]/g, ' ') // Remplacer ponctuation par espace
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

// Fonction pour extraire les tags d'une propriété
function extractTags(property) {
  const tags = [];
  const title = property.title || '';
  const description = property.description || '';
  const combinedText = normalizeText(title + ' ' + description);
  // Normaliser typeProperty pour les comparaisons (en minuscules)
  const typeProperty = (property.typeProperty || '').toLowerCase();
  const nbrRooms = property.nbrRooms || 0;
  const nbrBathrooms = property.nbrBathrooms || 0;
  const city = normalizeText(property.city || '');
  const status = property.status || '';
  
  // Tags basés sur le type de propriété (PascalCase)
  if (typeProperty === 'villa') {
    tags.push('Villa');
  }
  if (typeProperty === 'shop' || typeProperty === 'kiosk') {
    tags.push('Boutique');
  }
  if (combinedText.includes('duplex')) {
    tags.push('Duplex');
  }
  
  // Tags basés sur la description
  if (combinedText.match(/\b(barriere|barrière|sous barriere|sécurisé|securise|gardien|garde|sécurité)\b/)) {
    tags.push('Sous barrière');
  }
  if (combinedText.match(/\b(securise|sécurisé|sécurité|securite|gardien|garde|surveillance)\b/)) {
    tags.push('Sécurisé');
  }
  if (combinedText.match(/\b(meuble|meublé|meublee|mobilier)\b/)) {
    tags.push('Meublé');
  }
  if (combinedText.match(/\b(parking|parc auto|stationnement)\b/)) {
    tags.push('Parking');
  }
  if (combinedText.match(/\b(garage|garages)\b/)) {
    tags.push('Garage');
  }
  if (combinedText.match(/\b(balcon|balcons)\b/)) {
    tags.push('Balcon');
  }
  if (combinedText.match(/\b(terrasse|terrasses)\b/)) {
    tags.push('Terrasse');
  }
  if (combinedText.match(/\b(piscine|piscines|swimming)\b/)) {
    tags.push('Piscine');
  }
  if (combinedText.match(/\b(wifi|wi-fi|wi fi|internet|connexion)\b/)) {
    tags.push('Wi-Fi');
  }
  if (combinedText.match(/\b(centre ville|centre-ville|downtown|centre)\b/)) {
    tags.push('Centre-ville');
  }
  if (combinedText.match(/\b(plage|beach|bord de mer|littoral)\b/)) {
    tags.push('Proche de la plage');
  }
  if (combinedText.match(/\b(montagne|mont|mountain|altitude)\b/)) {
    tags.push('Montagne');
  }
  if (combinedText.match(/\b(nature|jardin|verdure|vegetation|espace vert)\b/)) {
    tags.push('Nature');
  }
  if (combinedText.match(/\b(commerce|commerces|magasin|shop|boutique|supermarché|supermarche|marché|marche)\b/)) {
    tags.push('Commerces proches');
  }
  if (combinedText.match(/\b(transport|bus|taxi|gare|station|arrêt|arret)\b/)) {
    tags.push('Transport proche');
  }
  if (combinedText.match(/\b(étudiant|etudiant|student|université|universite|école|ecole)\b/)) {
    tags.push('Étudiant');
  }
  if (combinedText.match(/\b(calme|tranquille|tranquillité|tranquillite|paix|quiet)\b/)) {
    tags.push('Calme et tranquillité');
  }
  if (combinedText.match(/\b(famille|familial|enfants|enfant|family)\b/)) {
    tags.push('Famille');
  }
  if (combinedText.match(/\b(couple|couples|romantique)\b/)) {
    tags.push('Couple');
  }
  if (combinedText.match(/\b(travail|work|bureau|bureaux|professionnel)\b/)) {
    tags.push('Travail');
  }
  if (combinedText.match(/\b(vacances|vacation|holiday|tourisme)\b/)) {
    tags.push('Vacances');
  }
  if (combinedText.match(/\b(animal|animaux|chien|chat|pet|pets|accepte animaux)\b/)) {
    tags.push('Animaux admis');
  }
  if (combinedText.match(/\b(enfant|enfants|kids|adapté enfants|adapte enfants)\b/)) {
    tags.push('Adapté aux enfants');
  }
  if (combinedText.match(/\b(handicapé|handicape|handicapés|handicapes|accessible|accessibilité)\b/)) {
    tags.push('Accessible handicapés');
  }
  if (combinedText.match(/\b(vélo|velo|bicyclette|cyclisme|bike)\b/)) {
    tags.push('Vélo');
  }
  if (combinedText.match(/\b(sport|sportif|sportive|activité sportive|activite sportive|gym|fitness)\b/)) {
    tags.push('Activités sportives');
  }
  if (combinedText.match(/\b(collocation|colocation|coloc|roommate|partage)\b/)) {
    tags.push('Collocation');
  }
  if (combinedText.match(/\b(court séjour|court sejour|short stay|temporaire)\b/)) {
    tags.push('Court séjour');
  }
  
  // Tags basés sur le type de propriétaire (déduit du texte)
  if (combinedText.match(/\b(propriétaire|proprietaire|bailleur|proprio)\b/) && 
      !combinedText.match(/\b(agence|agent|immobilier|immo)\b/)) {
    tags.push('Propriétaire');
  }
  if (combinedText.match(/\b(agence|agent|immobilier|immo|real estate|services immobiliers)\b/)) {
    tags.push('Agence');
  }
  
  // Tags basés sur le nombre de chambres (si pas déjà détecté)
  if (nbrRooms >= 3 && !tags.includes('Famille')) {
    tags.push('Famille'); // 3+ chambres = généralement pour famille
  }
  if (nbrRooms === 1 && !tags.includes('Couple') && !tags.includes('Étudiant')) {
    tags.push('Couple'); // 1 chambre = souvent pour couple
  }
  
  // Tags basés sur le type de propriété (si pas déjà détecté)
  // Note: typeProperty est maintenant en PascalCase (Home, Studio, Apartment, etc.)
  if (typeProperty === 'room' && !tags.includes('Collocation')) {
    tags.push('Collocation');
  }
  if (typeProperty === 'land' && !tags.includes('Nature')) {
    tags.push('Nature');
  }
  if (typeProperty === 'shop' || typeProperty === 'kiosk') {
    if (!tags.includes('Boutique')) {
      tags.push('Boutique');
    }
  }
  
  // Tags basés sur la localisation (si description courte)
  if (combinedText.length < 100) {
    // Si c'est dans Libreville centre, ajouter Centre-ville
    if (city.includes('libreville') && (combinedText.includes('centre') || combinedText.includes('ville'))) {
      tags.push('Centre-ville');
    }
    // Si c'est un studio ou chambre, souvent pour étudiant ou couple
    if ((typeProperty === 'studio' || typeProperty === 'room') && tags.length === 0) {
      tags.push('Étudiant');
    }
  }
  
  // Tags par défaut si aucun tag n'a été trouvé
  if (tags.length === 0) {
    // Essayer de trouver au moins un tag basé sur le type (PascalCase)
    if (typeProperty === 'villa' || typeProperty === 'home') {
      tags.push('Villa');
    } else if (typeProperty === 'apartment') {
      tags.push('Centre-ville');
    } else if (typeProperty === 'studio') {
      tags.push('Étudiant');
    } else if (typeProperty === 'room') {
      tags.push('Collocation');
    }
  }
  
  // Dédupliquer les tags
  return [...new Set(tags)].slice(0, 6); // MAX_TAGS = 6
}

// Lire le fichier
console.log('📖 Lecture du fichier...');
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

let tagsAddedCount = 0;
let propertiesWithTags = 0;

// Parcourir toutes les propriétés
console.log('🏷️  Extraction et ajout des tags...');
data.properties.forEach((property, index) => {
  const tags = extractTags(property);
  
  if (tags.length > 0) {
    property.tags = tags;
    tagsAddedCount += tags.length;
    propertiesWithTags++;
  } else {
    // Garder un tableau vide si pas de tags
    property.tags = [];
  }
});

// Sauvegarder le fichier
console.log('💾 Sauvegarde du fichier...');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');

console.log('\n✅ Tags ajoutés avec succès !');
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés avec tags: ${propertiesWithTags} (${((propertiesWithTags/data.properties.length)*100).toFixed(1)}%)`);
console.log(`   - Total tags ajoutés: ${tagsAddedCount}`);
console.log(`   - Moyenne de tags par propriété: ${(tagsAddedCount/propertiesWithTags).toFixed(1)}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

