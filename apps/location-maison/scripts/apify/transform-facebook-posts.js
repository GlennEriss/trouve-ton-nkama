const fs = require('fs/promises');
const path = require('path');
const { FacebookPostProcessor } = require('./extractors/facebook-json-extractor');
const { AIPropertyMapper } = require('./mappers/ai-property-mapper');
const { configLoader } = require('../ia/config/config-loader');

async function main() {
  console.log('🚀 Démarrage de la transformation des posts Facebook JSON via IA...\n');
  
  try {
    // 1. Charger la configuration
    console.log('📋 Chargement de la configuration...');
    await configLoader.loadConfig();
    console.log('✅ Configuration chargée\n');
    
    // 2. Initialiser les composants
    console.log('🔧 Initialisation des composants...');
    const processor = new FacebookPostProcessor();
    const mapper = new AIPropertyMapper();
    await mapper.initialize();
    console.log('✅ Composants initialisés\n');
    
    // 3. Charger et filtrer les posts Facebook
    console.log('📄 Chargement des fichiers JSON Facebook...');
    const allPosts = await processor.loadAllFacebookJsonFiles();
    console.log(`📊 ${allPosts.length} posts au total trouvés\n`);
    
    // 4. Filtrer les posts valides (minimum 2 photos)
    console.log('🔍 Filtrage des posts valides (minimum 2 photos)...');
    const validPosts = processor.filterValidPosts(allPosts);
    console.log(`✅ ${validPosts.length} posts valides (avec au moins 2 photos)`);
    console.log(`❌ ${allPosts.length - validPosts.length} posts rejetés (photos insuffisantes)\n`);
    
    if (validPosts.length === 0) {
      console.log('⚠️ Aucun post valide trouvé. Arrêt du script.');
      process.exit(0);
    }
    
    // 5. Afficher le statut des clés API
    console.log('🔑 Statut des clés API :');
    mapper.keyManager.getKeyStatus();
    
    // 6. Transformer les posts via IA
    console.log('🤖 Début de la transformation IA...');
    const results = await mapper.mapPostsToProperties(validPosts);
    
    // 7. Analyser les résultats
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📊 RÉSULTATS DE LA TRANSFORMATION :');
    console.log(`✅ Succès : ${successful.length}/${results.length}`);
    console.log(`❌ Échecs : ${failed.length}/${results.length}`);
    
    // 8. Sauvegarder les résultats (même partiels)
    if (successful.length > 0) {
      console.log('\n💾 Sauvegarde des propriétés transformées...');
      const transformedData = successful.map(r => r.data);
      await processor.saveTransformedData(transformedData);
      console.log('✅ Données sauvegardées\n');
    } else {
      console.log('\n⚠️ Aucune propriété transformée avec succès');
    }
    
    // 9. Afficher les échecs
    if (failed.length > 0) {
      console.log('\n❌ POSTS EN ÉCHEC :');
      failed.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.originalPost?.text?.substring(0, 50)}...`);
        console.log(`     Erreur : ${result.error}`);
      });
    }
    
    // 10. Finaliser et afficher les stats
    console.log('📈 Finalisation...');
    await mapper.finalize();
    
    console.log('\n🎉 TRANSFORMATION TERMINÉE !');
    console.log(`📄 Posts traités : ${results.length}`);
    console.log(`✅ Propriétés générées : ${successful.length}`);
    console.log(`❌ Échecs : ${failed.length}`);
    
    if (successful.length > 0) {
      console.log(`📁 Fichier de sortie : facebook-transformed-properties.json`);
      
      // 10.5. Déduplication automatique
      console.log('\n🔄 DÉMARRAGE DE LA DÉDUPLICATION...');
      const { PropertyDeduplicator } = require('./deduplicate-properties');
      const deduplicator = new PropertyDeduplicator();
      
      // Charger et dédupliquer
      const propertiesData = await fs.readFile('facebook-transformed-properties.json', 'utf8');
      const properties = JSON.parse(propertiesData);
      const uniqueProperties = await deduplicator.deduplicateProperties(properties);
      
      // Sauvegarder la version dédupliquée
      await fs.writeFile('facebook-transformed-properties-deduplicated.json', JSON.stringify(uniqueProperties, null, 2), 'utf8');
      
      console.log(`✅ Fichier dédupliqué sauvegardé : facebook-transformed-properties-deduplicated.json`);
      console.log(`📊 ${properties.length} → ${uniqueProperties.length} propriétés (${properties.length - uniqueProperties.length} doublons supprimés)`);
    }
    
    // 11. Arrêter le script proprement
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERREUR FATALE :', error);
    process.exit(1);
  }
}

// Point d'entrée
if (require.main === module) {
  main();
}

module.exports = { main }; 