const fs = require('fs');
const path = require('path');

const propertiesFile = path.join(__dirname, 'properties-extracted-combined.json');
const osmFile = path.join(__dirname, '../openstreetmap/gabon_osm.json');

// Fonction pour normaliser le texte pour la recherche
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour calculer la distance entre deux points (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fonction pour extraire les mentions de localisation depuis le texte
function extractLocationMentions(text) {
  const mentions = [];
  const normalized = normalizeText(text);
  
  // Patterns pour détecter les localisations
  // PK (Point kilométrique) - format spécial
  const pkMatches = text.match(/\b(pk|point kilométrique)\s*(\d+)\b/gi);
  if (pkMatches) {
    pkMatches.forEach(match => {
      const pkNum = match.match(/\d+/);
      if (pkNum) {
        mentions.push(`PK ${pkNum[0]}`);
        mentions.push(`PK${pkNum[0]}`);
      }
    });
  }
  
  // Quartiers connus - liste exhaustive avec variantes
  const quartierKeywords = [
    { patterns: ['mindoubé', 'mindoube'], name: 'Mindoubé' },
    { patterns: ['nzeng ayong', 'nzengayong', 'nzeng-ayong'], name: 'Nzeng Ayong' },
    { patterns: ['akanda'], name: 'Akanda' },
    { patterns: ['owendo'], name: 'Owendo' },
    { patterns: ['angondjé', 'angondje'], name: 'Angondjé' },
    { patterns: ['jouvence'], name: 'Jouvence' },
    { patterns: ['nsam'], name: 'Nsam' },
    { patterns: ['ndopassi'], name: 'Ndopassi' },
    { patterns: ['gué gué', 'gue gue', 'gué-gué', 'gue-gue'], name: 'Gué Gué' },
    { patterns: ['haut de gué gué', 'haut de gue gue', 'haut de gué-gué'], name: 'Haut de Gué Gué' },
    { patterns: ['kalikak'], name: 'Kalikak' },
    { patterns: ['montagne sainte', 'montagne saint'], name: 'Montagne Sainte' },
    { patterns: ['charbonnages'], name: 'Charbonnages' },
    { patterns: ['betsaïda', 'betsaida'], name: 'Betsaïda' },
    { patterns: ['iai', 'i.a.i'], name: 'IAI' },
    { patterns: ['asni'], name: 'Asni' },
    { patterns: ['alenakiri', 'alénakirie'], name: 'Alénakirie' },
    { patterns: ['akanda marseille'], name: 'Akanda Marseille' },
    { patterns: ['cité octra', 'citée octra', 'octra'], name: 'Cité Octra' }
  ];
  
  quartierKeywords.forEach(({ patterns, name }) => {
    patterns.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern.replace(/\s+/g, '\\s+').replace(/[éèêë]/g, '[éèêë]').replace(/[àâä]/g, '[àâä]').replace(/[ôö]/g, '[ôö]').replace(/[ùûü]/g, '[ùûü]')}\\b`, 'gi');
      if (regex.test(text)) {
        mentions.push(name);
        // Ajouter aussi les variantes pour la recherche
        patterns.forEach(p => mentions.push(p));
      }
    });
  });
  
  // PK - chercher tous les PK mentionnés
  const pkNumbers = [];
  const pkPattern = /\b(pk|point kilométrique)\s*(\d+)\b/gi;
  let pkMatch;
  while ((pkMatch = pkPattern.exec(text)) !== null) {
    const pkNum = pkMatch[2];
    pkNumbers.push(pkNum);
    mentions.push(`PK ${pkNum}`);
    mentions.push(`PK${pkNum}`);
  }
  
  // Autres mentions de quartiers avec contexte
  const contextPatterns = [
    /\b(quartier|lieu\s*dit|près\s*de|à\s*côté\s*de|derrière|vers|au\s*haut\s*de)\s+([a-zéèêëàâäôöùûüç\s]{3,30})\b/gi
  ];
  
  contextPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/\b(quartier|lieu dit|près de|à côté de|derrière|vers|au haut de)\b/gi, '').trim();
        if (cleaned.length > 3 && cleaned.length < 50) {
          mentions.push(cleaned);
        }
      });
    }
  });
  
  // Extraire aussi les mots en majuscules qui pourraient être des quartiers
  const words = text.split(/\s+/);
  words.forEach((word, index) => {
    if (word.length > 3 && word === word.toUpperCase() && /^[A-ZÉÈÊËÀÂÄÔÖÙÛÜÇ]+$/.test(word)) {
      mentions.push(word);
    }
  });
  
  return [...new Set(mentions)]; // Supprimer les doublons
}

// Fonction pour trouver une localisation dans OSM
function findLocationInOSM(mention, osmData) {
  const normalizedMention = normalizeText(mention);
  const results = [];
  
  // Fonction helper pour vérifier la correspondance
  const matches = (name1, name2) => {
    const n1 = normalizeText(name1);
    const n2 = normalizeText(name2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  };
  
  // Chercher dans les suburbs
  if (osmData.places && osmData.places.suburb) {
    osmData.places.suburb.forEach(place => {
      if (place.name && matches(place.name, mention)) {
        results.push({
          name: place.name,
          type: 'suburb',
          city: place.tags?.['addr:city'] || null,
          center: place.center,
          tags: place.tags
        });
      }
    });
  }
  
  // Chercher dans les neighbourhoods
  if (osmData.places && osmData.places.neighbourhood) {
    osmData.places.neighbourhood.forEach(place => {
      if (place.name && matches(place.name, mention)) {
        results.push({
          name: place.name,
          type: 'neighbourhood',
          city: place.tags?.['addr:city'] || null,
          center: place.center,
          tags: place.tags
        });
      }
    });
  }
  
  // Chercher dans les quarters
  if (osmData.places && osmData.places.quarter) {
    osmData.places.quarter.forEach(place => {
      if (place.name && matches(place.name, mention)) {
        results.push({
          name: place.name,
          type: 'quarter',
          city: place.tags?.['addr:city'] || null,
          center: place.center,
          tags: place.tags
        });
      }
    });
  }
  
  // Chercher aussi dans les villages pour certains cas
  if (osmData.places && osmData.places.village) {
    osmData.places.village.forEach(place => {
      if (place.name && matches(place.name, mention)) {
        results.push({
          name: place.name,
          type: 'village',
          city: place.tags?.['addr:city'] || null,
          center: place.center,
          tags: place.tags
        });
      }
    });
  }
  
  return results;
}

// Fonction pour trouver la ville la plus proche
function findNearestCity(lat, lon, osmData) {
  if (!lat || !lon) return null;
  
  let nearestCity = null;
  let minDistance = Infinity;
  
  if (osmData.places && osmData.places.city) {
    osmData.places.city.forEach(city => {
      if (city.center && city.center.lat && city.center.lon) {
        const distance = calculateDistance(lat, lon, city.center.lat, city.center.lon);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCity = city.name;
        }
      }
    });
  }
  
  return nearestCity;
}

console.log('📖 Lecture des fichiers...');
const propertiesData = JSON.parse(fs.readFileSync(propertiesFile, 'utf8'));
const osmData = JSON.parse(fs.readFileSync(osmFile, 'utf8'));

console.log('🔍 Analyse et correction des localisations...');
let correctedCount = 0;
const corrections = [];

propertiesData.properties.forEach((property, index) => {
  const originalCity = property.city;
  const originalStreet = property.street;
  
  // Extraire les mentions de localisation depuis le titre et la description
  const text = `${property.title || ''} ${property.description || ''}`;
  const mentions = extractLocationMentions(text);
  
  let newCity = originalCity;
  let newStreet = originalStreet;
  
  // Vérifier d'abord si on mentionne une ville directement (Owendo, Akanda)
  const cityMentions = ['owendo', 'akanda'];
  for (const cityMention of cityMentions) {
    if (normalizeText(text).includes(cityMention)) {
      // Chercher cette ville dans OSM
      const cityInOSM = osmData.places.city?.find(c => normalizeText(c.name) === cityMention);
      if (cityInOSM) {
        newCity = cityInOSM.name;
        break;
      }
    }
  }
  
  // Vérifier si on mentionne Angondjé - c'est dans Akanda
  if (!newCity && normalizeText(text).includes('angondj')) {
    newCity = 'Akanda';
  }
  
  // Chercher chaque mention dans OSM
  for (const mention of mentions) {
    const osmResults = findLocationInOSM(mention, osmData);
    
    if (osmResults.length > 0) {
      // Prendre le premier résultat (le plus pertinent)
      const result = osmResults[0];
      
      // Si on a trouvé une ville directement
      if (result.city && !newCity) {
        newCity = result.city;
      }
      
      // Vérifier si le résultat est une ville (pas juste un quartier)
      const isCity = osmData.places.city?.some(c => normalizeText(c.name) === normalizeText(result.name));
      if (isCity && !newCity) {
        newCity = result.name;
      }
      
      // Si on a trouvé un quartier/suburb, l'utiliser comme street
      if (result.name && result.name.length > 0 && !isCity) {
        newStreet = result.name;
        
        // Si on n'a pas de ville mais qu'on a des coordonnées, trouver la ville la plus proche
        if (!newCity && result.center && result.center.lat && result.center.lon) {
          const nearestCity = findNearestCity(result.center.lat, result.center.lon, osmData);
          if (nearestCity) {
            newCity = nearestCity;
          }
        }
        
        // Règle spéciale : Angondjé est dans Akanda
        if (!newCity && normalizeText(result.name).includes('angondj')) {
          newCity = 'Akanda';
        }
      }
      
      // Si on a des coordonnées de la propriété, utiliser la ville la plus proche
      if (property.latitude && property.longitude && !newCity) {
        const nearestCity = findNearestCity(property.latitude, property.longitude, osmData);
        if (nearestCity) {
          newCity = nearestCity;
        }
      }
      
      break; // Prendre la première correspondance trouvée
    }
  }
  
  // Si on a mentionné "Haut de Gué Gué" mais qu'on n'a rien trouvé, chercher juste "Gué Gué"
  if (!newStreet && mentions.some(m => normalizeText(m).includes('haut de gue gue') || normalizeText(m).includes('haut de gué gué'))) {
    const guéGuéResults = findLocationInOSM('Gué Gué', osmData);
    if (guéGuéResults.length > 0) {
      newStreet = 'Haut de Gué Gué'; // Utiliser le nom complet même si pas dans OSM
    } else {
      // Si pas trouvé dans OSM, utiliser quand même le nom mentionné
      newStreet = 'Haut de Gué Gué';
    }
  }
  
  // Si on a trouvé un PK mais pas de correspondance exacte, créer un nom de quartier basé sur le PK
  if (!newStreet && mentions.some(m => m.startsWith('PK'))) {
    const pkMatch = mentions.find(m => m.startsWith('PK'));
    if (pkMatch) {
      newStreet = pkMatch; // Utiliser "PK 7" comme nom de quartier même si pas dans OSM
      
      // Si on n'a pas de ville mais qu'on a des coordonnées, trouver la ville la plus proche
      if (!newCity && property.latitude && property.longitude) {
        const nearestCity = findNearestCity(property.latitude, property.longitude, osmData);
        if (nearestCity) {
          newCity = nearestCity;
        }
      }
    }
  }
  
  // Si on a mentionné "Haut de Gué Gué" mais qu'on n'a rien trouvé, utiliser le nom mentionné
  if (!newStreet && (normalizeText(text).includes('haut de gue gue') || normalizeText(text).includes('haut de gué gué'))) {
    newStreet = 'Haut de Gué Gué';
  }
  
  // Vérifier si "Cité Octra" est mentionné - priorité absolue même si déjà un street défini
  if (/\b(cité|citée)\s*octra\b/gi.test(text) || (/\boctra\b/gi.test(text) && normalizeText(text).includes('owendo'))) {
    newStreet = 'Cité Octra';
  }
  
  // Extraire les quartiers mentionnés après "Lieu :", "Zone :", etc. (priorité élevée)
  if (!newStreet) {
    // Pattern 1: "Lieu :", "Zone :", "Quartier :", "Cité :"
    const explicitPattern = /(?:lieu|zone|quartier|cit[ée]|village)\s*[:]\s*([^:\n\(,]{3,50})/gi;
    const explicitMatch = explicitPattern.exec(text);
    if (explicitMatch && explicitMatch[1]) {
      let location = explicitMatch[1].trim();
      // Nettoyer les parenthèses et leurs contenus
      location = location.replace(/\s*\([^)]*\)\s*/g, '').trim();
      location = location.replace(/\s+/g, ' ').trim();
      // Exclure les mots-clés non pertinents et phrases complètes
      const excludeKeywords = ['prix', 'contact', 'tel', 'loyer', 'caution', 'visite', 'frais', 'mille', 'millions', 'à vendre', 'vendre', 'caractéristiques', 'modalités', 'concession', 'studio'];
      const wordCount = location.split(/\s+/).length;
      const shouldExclude = excludeKeywords.some(kw => location.toLowerCase().includes(kw)) || wordCount > 5;
      if (!shouldExclude && location.length > 3 && location.length < 50) {
        // Capitaliser correctement
        const capitalized = location.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        newStreet = capitalized;
      }
    }
  }
  
  // Si on a mentionné d'autres quartiers connus mais pas trouvés dans OSM, utiliser les noms mentionnés
  if (!newStreet) {
    const knownQuartiers = [
      { pattern: /beau\s*séjour\s*bangos/gi, name: 'Beau séjour bangos' },
      { pattern: /beau\s*séjour\s*okinda/gi, name: 'Beau séjour okinda' },
      { pattern: /marseille\s*2|marsaille\s*2/gi, name: 'Marseille 2', city: 'Akanda' },
      { pattern: /okala/gi, name: 'Okala' },
      { pattern: /awoungou/gi, name: 'Awoungou' },
      { pattern: /cit[ée]\s*rose/gi, name: 'Cité Rose' },
      { pattern: /cit[ée]\s*damas/gi, name: 'Cité Damas' },
      { pattern: /cit[ée]\s*cnss/gi, name: 'Cité CNSS' },
      { pattern: /santaclara|santa\s*clara/gi, name: 'Santaclara' },
      { pattern: /sablière|sabliere/gi, name: 'Sablière' },
      { pattern: /mindoubé|mindoube/gi, name: 'Mindoubé' },
      { pattern: /nzeng\s*ayong/gi, name: 'Nzeng Ayong' },
      { pattern: /angondjé|angondje/gi, name: 'Angondjé', city: 'Akanda' },
      { pattern: /jouvence/gi, name: 'Jouvence' },
      { pattern: /nsam/gi, name: 'Nsam' },
      { pattern: /ndopassi/gi, name: 'Ndopassi' },
      { pattern: /kalikak/gi, name: 'Kalikak' },
      { pattern: /montagne\s*sainte|montagne\s*saint/gi, name: 'Montagne Sainte' },
      { pattern: /charbonnages/gi, name: 'Charbonnages' },
      { pattern: /betsaïda|betsaida/gi, name: 'Betsaïda' },
      { pattern: /\biai\b/gi, name: 'IAI' },
      { pattern: /asni/gi, name: 'Asni' },
      { pattern: /alenakiri|alénakirie/gi, name: 'Alénakirie' }
    ];
    
    for (const quartier of knownQuartiers) {
      if (quartier.pattern.test(text)) {
        newStreet = quartier.name;
        // Si le quartier nécessite une ville spécifique (comme Angondjé dans Akanda)
        if (quartier.city && !newCity) {
          newCity = quartier.city;
        }
        break;
      }
    }
  }
  
  // Règles spéciales pour certains quartiers (priorité absolue)
  // Angondjé est dans Akanda
  if (normalizeText(text).includes('angondj')) {
    newStreet = 'Angondjé';
    newCity = 'Akanda';
  }
  // Marseille 2 est dans Akanda
  else if (normalizeText(text).includes('marseille 2') || normalizeText(text).includes('marsaille 2')) {
    newStreet = 'Marseille 2';
    newCity = 'Akanda';
  }
  // Awoungou ne doit pas être "Owendo Port"
  else if (normalizeText(text).includes('awoungou') && newStreet === 'Owendo Port') {
    newStreet = 'Awoungou';
  }
  
  // Si on n'a toujours pas de ville, utiliser Libreville par défaut (province Estuaire)
  if (!newCity) {
    newCity = 'Libreville';
  }
  
  // Appliquer les corrections
  if (newCity !== originalCity || newStreet !== originalStreet) {
    corrections.push({
      index: index + 1,
      title: property.title?.substring(0, 50) || 'Sans titre',
      original: { city: originalCity, street: originalStreet },
      corrected: { city: newCity, street: newStreet },
      mentions: mentions.slice(0, 3)
    });
    
    property.city = newCity;
    property.street = newStreet;
    correctedCount++;
  }
});

fs.writeFileSync(propertiesFile, JSON.stringify(propertiesData, null, 2), 'utf8');

console.log('\n✅ Correction terminée !');
console.log(`📊 Statistiques:`);
console.log(`   - Propriétés corrigées: ${correctedCount}/${propertiesData.properties.length}`);

if (corrections.length > 0) {
  console.log('\n📋 Exemples de corrections:\n');
  corrections.slice(0, 10).forEach((correction, i) => {
    console.log(`   ${i + 1}. "${correction.title}"`);
    console.log(`      Mentions trouvées: ${correction.mentions.join(', ')}`);
    console.log(`      Avant: city="${correction.original.city}", street="${correction.original.street}"`);
    console.log(`      Après: city="${correction.corrected.city}", street="${correction.corrected.street}"`);
    console.log('');
  });
  
  if (corrections.length > 10) {
    console.log(`   ... et ${corrections.length - 10} autres corrections\n`);
  }
}

// Statistiques par ville
const cityStats = {};
propertiesData.properties.forEach(p => {
  cityStats[p.city] = (cityStats[p.city] || 0) + 1;
});

console.log('\n📊 Répartition par ville:\n');
Object.entries(cityStats).sort((a, b) => b[1] - a[1]).forEach(([city, count]) => {
  console.log(`   - ${city}: ${count}`);
});

