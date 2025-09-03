const fs = require('fs').promises;

class PropertyDeduplicator {
  constructor() {
    this.duplicateThreshold = 0.8; // Seuil de similarité pour considérer comme doublon
  }

  // Calculer la similarité entre deux textes
  calculateSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Normaliser le contact (supprimer espaces, caractères spéciaux)
  normalizeContact(contact) {
    return contact.replace(/[\s\-\/\+\(\)]/g, '');
  }

  // Vérifier si deux propriétés sont des doublons
  arePropertiesDuplicate(prop1, prop2) {
    // Même type de propriété
    if (prop1.typeProperty !== prop2.typeProperty) {
      return false;
    }

    // Même prix (ou très proche)
    const priceDiff = Math.abs(prop1.price - prop2.price) / Math.max(prop1.price, prop2.price);
    if (priceDiff > 0.1) { // Plus de 10% de différence
      return false;
    }

    // Même contact (normalisé)
    const contact1 = this.normalizeContact(prop1.contact || '');
    const contact2 = this.normalizeContact(prop2.contact || '');
    if (contact1 && contact2 && contact1 === contact2) {
      // Même contact, vérifier la similarité du titre et description
      const titleSimilarity = this.calculateSimilarity(prop1.title, prop2.title);
      const descSimilarity = this.calculateSimilarity(prop1.description, prop2.description);
      
      if (titleSimilarity > this.duplicateThreshold || descSimilarity > this.duplicateThreshold) {
        return true;
      }
    }

    // Même localisation approximative et caractéristiques
    if (prop1.city === prop2.city && 
        prop1.nbrRooms === prop2.nbrRooms &&
        Math.abs(prop1.price - prop2.price) < 50000) {
      
      const titleSimilarity = this.calculateSimilarity(prop1.title, prop2.title);
      const descSimilarity = this.calculateSimilarity(prop1.description, prop2.description);
      
      if (titleSimilarity > this.duplicateThreshold && descSimilarity > this.duplicateThreshold) {
        return true;
      }
    }

    return false;
  }

  // Choisir la meilleure propriété parmi les doublons
  selectBestProperty(duplicateGroup) {
    // Critères de sélection :
    // 1. Plus d'informations (longitude/latitude non nulles)
    // 2. Description plus longue
    // 3. Plus d'images
    // 4. Contact non générique

    return duplicateGroup.reduce((best, current) => {
      let score = 0;
      let bestScore = 0;

      // Plus d'informations géographiques
      if (current.longitude !== 0 && current.latitude !== 0) score += 2;
      if (best.longitude !== 0 && best.latitude !== 0) bestScore += 2;

      // Description plus détaillée
      if (current.description.length > best.description.length) score += 1;
      else bestScore += 1;

      // Plus d'images
      if (current.images.length > best.images.length) score += 1;
      else if (best.images.length > current.images.length) bestScore += 1;

      // Contact non générique
      if (current.contact && !current.contact.includes('non précisé') && !current.contact.includes('0123456789')) score += 1;
      if (best.contact && !best.contact.includes('non précisé') && !best.contact.includes('0123456789')) bestScore += 1;

      // Province/street renseignés
      if (current.province && current.province.trim()) score += 0.5;
      if (best.province && best.province.trim()) bestScore += 0.5;
      
      if (current.street && current.street.trim()) score += 0.5;
      if (best.street && best.street.trim()) bestScore += 0.5;

      return score > bestScore ? current : best;
    });
  }

  // Supprimer les doublons d'une liste de propriétés
  async deduplicateProperties(properties) {
    console.log(`🔍 Analyse de ${properties.length} propriétés pour détecter les doublons...`);
    
    const groups = [];
    const processed = new Set();

    for (let i = 0; i < properties.length; i++) {
      if (processed.has(i)) continue;

      const currentGroup = [properties[i]];
      processed.add(i);

      // Chercher tous les doublons de cette propriété
      for (let j = i + 1; j < properties.length; j++) {
        if (processed.has(j)) continue;

        if (this.arePropertiesDuplicate(properties[i], properties[j])) {
          currentGroup.push(properties[j]);
          processed.add(j);
        }
      }

      groups.push(currentGroup);
    }

    // Statistiques
    const duplicateGroups = groups.filter(group => group.length > 1);
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);

    console.log(`📊 RÉSULTATS DE LA DÉDUPLICATION :`);
    console.log(`   💫 Propriétés uniques : ${groups.filter(g => g.length === 1).length}`);
    console.log(`   🔄 Groupes de doublons : ${duplicateGroups.length}`);
    console.log(`   ❌ Doublons supprimés : ${totalDuplicates}`);
    console.log(`   ✅ Propriétés finales : ${groups.length}`);

    if (duplicateGroups.length > 0) {
      console.log(`\n📋 DÉTAILS DES DOUBLONS DÉTECTÉS :`);
      duplicateGroups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group[0].typeProperty} - "${group[0].title}" (${group.length} doublons)`);
        console.log(`      Prix: ${group[0].price}F, Contact: ${group[0].contact}`);
      });
    }

    // Retourner une propriété par groupe (la meilleure)
    return groups.map(group => {
      if (group.length === 1) {
        return group[0];
      } else {
        return this.selectBestProperty(group);
      }
    });
  }

  async run() {
    try {
      console.log('🚀 Démarrage de la déduplication des propriétés...\n');

      // Charger les propriétés
      console.log('📄 Chargement du fichier facebook-transformed-properties.json...');
      const rawData = await fs.readFile('facebook-transformed-properties.json', 'utf8');
      const properties = JSON.parse(rawData);
      console.log(`✅ ${properties.length} propriétés chargées\n`);

      // Déduplication
      const uniqueProperties = await this.deduplicateProperties(properties);

      // Sauvegarder
      console.log('\n💾 Sauvegarde des propriétés dédupliquées...');
      await fs.writeFile(
        'facebook-transformed-properties-deduplicated.json',
        JSON.stringify(uniqueProperties, null, 2),
        'utf8'
      );
      console.log('✅ Fichier sauvegardé : facebook-transformed-properties-deduplicated.json');

      console.log('\n🎉 DÉDUPLICATION TERMINÉE !');
      console.log(`📄 Propriétés originales : ${properties.length}`);
      console.log(`✅ Propriétés finales : ${uniqueProperties.length}`);
      console.log(`❌ Doublons supprimés : ${properties.length - uniqueProperties.length}`);

    } catch (error) {
      console.error('❌ Erreur lors de la déduplication :', error);
      process.exit(1);
    }
  }
}

// Exécution
if (require.main === module) {
  const deduplicator = new PropertyDeduplicator();
  deduplicator.run();
}

module.exports = { PropertyDeduplicator }; 