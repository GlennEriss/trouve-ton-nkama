import * as fs from 'fs/promises';
import * as path from 'path';
import { FirebasePropertyService } from './firebase-admin';

async function main() {
  console.log('🚀 Démarrage de la sauvegarde des propriétés IA vers Firebase...\n');

  try {
    // 1. Initialiser le service Firebase
    const firebaseService = new FirebasePropertyService();
    await firebaseService.loadConfig();

    // 2. Charger les propriétés transformées
    const propertiesPath = path.join(__dirname, '../ia/extractors/transformed_properties.json');
    console.log('📄 Chargement des propriétés transformées...');
    
    const propertiesContent = await fs.readFile(propertiesPath, 'utf-8');
    const properties = JSON.parse(propertiesContent);
    
    // Filtrer les propriétés valides (exclure les objets vides et null)
    const validProperties = properties.filter((prop: any) => 
      prop && 
      typeof prop === 'object' && 
      Object.keys(prop).length > 0 &&
      prop.typeProperty && 
      prop.title
    );

    console.log(`✅ ${validProperties.length} propriétés valides trouvées sur ${properties.length} total`);

    if (validProperties.length === 0) {
      console.log('⚠️ Aucune propriété valide à sauvegarder');
      return;
    }

    // 3. Créer une sauvegarde avant modification
    console.log('\n💾 Création de la sauvegarde...');
    await firebaseService.createBackup();

    // 4. Sauvegarder les propriétés
    console.log('\n🔥 Sauvegarde vers Firebase...');
    const result = await firebaseService.saveProperties(validProperties);

    // 5. Afficher les statistiques
    console.log('\n📊 Statistiques de sauvegarde:');
    console.log(`✅ Succès: ${result.success}`);
    console.log(`❌ Erreurs: ${result.errors}`);
    console.log(`📈 Taux de succès: ${((result.success / validProperties.length) * 100).toFixed(1)}%`);

    // 6. Afficher les stats Firebase
    console.log('\n📈 Statistiques Firebase:');
    const stats = await firebaseService.getStats();
    console.log(`📄 Total propriétés en base: ${stats.total}`);
    console.log('📊 Répartition par type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\n🎉 Sauvegarde terminée avec succès !');

  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur dans le script principal:', error);
  process.exit(1);
}); 