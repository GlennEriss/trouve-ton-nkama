import { FacebookPostExtractor } from './extractors/facebook-post-extractor';
import { AIPropertyMapper } from './mappers/ai-property-mapper';
import { configLoader } from './config/config-loader';

async function main() {
  console.log('🚀 Démarrage de la transformation des propriétés Facebook via IA...\n');
  
  try {
    // 1. Charger la configuration
    console.log('📋 Chargement de la configuration...');
    await configLoader.loadConfig();
    console.log('✅ Configuration chargée\n');
    
    // 2. Initialiser les composants
    console.log('🔧 Initialisation des composants...');
    const extractor = new FacebookPostExtractor();
    const mapper = new AIPropertyMapper();
    await mapper.initialize();
    console.log('✅ Composants initialisés\n');
    
    // 3. Charger les posts Facebook
    console.log('📄 Chargement des posts Facebook...');
    const posts = await extractor.loadPropertyData();
    console.log(`✅ ${posts.length} posts chargés\n`);
    
    // 4. Afficher le statut des clés API
    console.log('🔑 Statut des clés API :');
    mapper['keyManager'].getKeyStatus();
    
    // 5. Transformer les posts via IA
    console.log('🤖 Début de la transformation IA...');
    const results = await mapper.mapPostsToProperties(posts);
    
    // 6. Analyser les résultats
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('\n📊 RÉSULTATS DE LA TRANSFORMATION :');
    console.log(`✅ Succès : ${successful.length}/${results.length}`);
    console.log(`❌ Échecs : ${failed.length}/${results.length}`);
    
    // 7. Sauvegarder les résultats (même partiels)
    if (successful.length > 0) {
      console.log('\n💾 Sauvegarde des propriétés transformées...');
      const transformedData = successful.map(r => r.data);
      await extractor.saveTransformedData(transformedData);
      console.log('✅ Données sauvegardées\n');
    } else {
      console.log('\n⚠️ Aucune propriété transformée avec succès');
    }
    
    // 8. Afficher les échecs
    if (failed.length > 0) {
      console.log('\n❌ POSTS EN ÉCHEC :');
      failed.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.originalPost?.text?.substring(0, 50)}...`);
        console.log(`     Erreur : ${result.error}`);
      });
    }
    
    // 9. Finaliser et afficher les stats
    console.log('📈 Finalisation...');
    await mapper.finalize();
    
    console.log('\n🎉 TRANSFORMATION TERMINÉE !');
    console.log(`📄 Posts traités : ${results.length}`);
    console.log(`✅ Propriétés générées : ${successful.length}`);
    console.log(`❌ Échecs : ${failed.length}`);
    
    if (successful.length > 0) {
      const config = await configLoader.loadConfig();
      console.log(`📁 Fichier de sortie : ${config.files.output}`);
    }
    
    // 10. Arrêter le script proprement
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

export { main }; 