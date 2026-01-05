const fs = require('fs');
const path = require('path');

// Fichier de sortie
const outputFile = path.join(__dirname, 'properties-extracted-combined.json');

// Tous les propriétés combinées
const allProperties = [];
let totalPostsAnalyzed = 0;

// Parcourir tous les fichiers properties-extracted-1.json à properties-extracted-18.json
for (let i = 1; i <= 18; i++) {
  const filePath = path.join(__dirname, `properties-extracted-${i}.json`);
  
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Ajouter les propriétés
      if (data.properties && Array.isArray(data.properties)) {
        allProperties.push(...data.properties);
        totalPostsAnalyzed += data.metadata?.totalPosts || 0;
        console.log(`✅ properties-extracted-${i}.json: ${data.properties.length} propriétés ajoutées`);
      } else {
        console.log(`⚠️  properties-extracted-${i}.json: format invalide`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la lecture de properties-extracted-${i}.json:`, error.message);
    }
  } else {
    console.log(`⚠️  properties-extracted-${i}.json: fichier non trouvé`);
  }
}

// Créer l'objet combiné
const combinedData = {
  metadata: {
    source: "Facebook Group",
    totalPosts: totalPostsAnalyzed,
    propertiesExtracted: allProperties.length,
    extractionDate: new Date().toISOString(),
    combinedFrom: "properties-extracted-1.json to properties-extracted-18.json"
  },
  properties: allProperties
};

// Sauvegarder le fichier combiné
fs.writeFileSync(outputFile, JSON.stringify(combinedData, null, 2), 'utf8');

console.log('\n✅ Fichier combiné créé avec succès !');
console.log(`📊 Total de propriétés: ${allProperties.length}`);
console.log(`📊 Total de posts analysés: ${totalPostsAnalyzed}`);
console.log(`💾 Fichier sauvegardé: ${outputFile}`);

