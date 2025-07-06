#!/usr/bin/env node
/**
 * Script d'importation des annonces immobilières
 * Importe des données JSON vers Firestore avec upload d'images
 */

// Chargement des variables d'environnement
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs/promises';
import * as path from 'path';
import { CONFIG, FIRESTORE_COLLECTIONS } from './config';
import { initializeFirebaseAdmin, testFirebaseConnection, displayFirebaseConfig } from './firebase/config';
import { BienJSON, mapPropertyByType } from './mappers';
import { loadLocationsData, findLocationByOriginal, mapLocationFromPhoton, createDefaultLocation } from './utils/location';
import { validateBienJSON, filterValidBiens, generateValidationReport } from './utils/validator';
import { uploadImagesForProperty, analyzeLocalImages } from './utils/image';

/**
 * Statistiques d'importation
 */
interface ImportStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  processingTime: number;
}

/**
 * Options d'importation
 */
interface ImportOptions {
  dryRun?: boolean;
  batchSize?: number;
  skipImages?: boolean;
  skipValidation?: boolean;
  startFrom?: number;
  limit?: number;
}

/**
 * Fonction principale d'importation
 */
async function importAnnonces(options: ImportOptions = {}): Promise<void> {
  const startTime = Date.now();
  
  console.log('🚀 Début de l\'importation des annonces');
  console.log('=====================================');
  
  const stats: ImportStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    processingTime: 0
  };

  try {
    // 1. Vérification de la configuration
    console.log('\n📋 Vérification de la configuration...');
    displayFirebaseConfig();
    
    // Affichage de la configuration des annonces
    console.log('\n👤 Configuration des annonces:');
    console.log(`  Propriétaire (createdBy): ${CONFIG.DEFAULT_CREATED_BY}`);
    console.log(`  État par défaut: ${CONFIG.DEFAULT_STATE}`);
    console.log(`  💡 Pour changer le propriétaire, modifiez CONFIG.DEFAULT_CREATED_BY dans config.ts`);
    
    // 2. Test de la connexion Firebase
    console.log('\n🔥 Test de la connexion Firebase...');
    const firebaseConnected = await testFirebaseConnection();
    if (!firebaseConnected) {
      throw new Error('Impossible de se connecter à Firebase');
    }

    // 3. Chargement des données
    console.log('\n📂 Chargement des données...');
    const biens = await loadBiensData();
    const localisations = await loadLocationsData(CONFIG.LOCALISATIONS_JSON_PATH);
    
    console.log(`✅ ${biens.length} annonces chargées`);
    console.log(`✅ ${localisations.locations.length} localisations chargées`);

    // 4. Analyse des images
    if (!options.skipImages) {
      console.log('\n🖼️ Analyse des images locales...');
      const imageAnalysis = await analyzeLocalImages(CONFIG.IMAGES_FOLDER_PATH);
      console.log(`✅ ${imageAnalysis.totalImages} images trouvées (${imageAnalysis.validImages} valides)`);
    }

    // 5. Validation des données
    if (!options.skipValidation) {
      console.log('\n✅ Validation des données...');
      const { valid, invalid, validationResults } = filterValidBiens(biens);
      
      console.log(`📊 Validation terminée:`);
      console.log(`  - Valides: ${valid.length}`);
      console.log(`  - Invalides: ${invalid.length}`);
      
      if (invalid.length > 0) {
        console.log('\n❌ Annonces invalides:');
        invalid.slice(0, 5).forEach(bien => {
          const validation = validationResults.get(bien.id);
          console.log(`  - ${bien.id}: ${validation?.errors.join(', ')}`);
        });
      }
      
      // Mise à jour des données avec seulement les annonces valides
      biens.splice(0, biens.length, ...valid);
    }

    // 6. Filtrage par options
    let biensToProcess = biens;
    if (options.startFrom) {
      biensToProcess = biensToProcess.slice(options.startFrom);
    }
    if (options.limit) {
      biensToProcess = biensToProcess.slice(0, options.limit);
    }

    console.log(`\n🎯 ${biensToProcess.length} annonces à traiter`);

    // 7. Traitement par lots
    const batchSize = options.batchSize || CONFIG.BATCH_SIZE;
    const totalBatches = Math.ceil(biensToProcess.length / batchSize);
    
    console.log(`\n⚡ Traitement par lots de ${batchSize} annonces (${totalBatches} lots)`);

    const firebase = initializeFirebaseAdmin();
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, biensToProcess.length);
      const batch = biensToProcess.slice(start, end);
      
      console.log(`\n📦 Traitement du lot ${i + 1}/${totalBatches} (${batch.length} annonces)`);
      
      const batchStats = await processBatch(firebase, batch, localisations, options);
      
      // Mise à jour des statistiques
      stats.totalProcessed += batchStats.totalProcessed;
      stats.successful += batchStats.successful;
      stats.failed += batchStats.failed;
      stats.skipped += batchStats.skipped;
      stats.errors.push(...batchStats.errors);
      
      console.log(`✅ Lot ${i + 1} terminé: ${batchStats.successful}/${batchStats.totalProcessed} réussies`);
      
      // Délai entre les lots
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    stats.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
  }

  // 8. Statistiques finales
  stats.processingTime = Date.now() - startTime;
  displayFinalStats(stats);
  
  // 9. Sauvegarde du rapport
  await saveImportReport(stats);
}

/**
 * Traite un lot d'annonces
 */
async function processBatch(
  firebase: any,
  batch: BienJSON[],
  localisations: any,
  options: ImportOptions
): Promise<ImportStats> {
  const stats: ImportStats = {
    totalProcessed: batch.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    processingTime: 0
  };

  for (const bien of batch) {
    try {
      // 1. Enrichissement de la localisation
      const locationData = findLocationByOriginal(localisations, bien.localisation);
      const location = locationData 
        ? mapLocationFromPhoton(locationData)
        : createDefaultLocation(bien.localisation);

      // 2. Mapping vers le format Firestore (sans images pour l'instant)
      const propertyWithoutImages = mapPropertyByType(bien, location, []);

      // 3. Sauvegarde dans Firestore pour obtenir l'ID généré par Firebase
      let firebaseId: string;
      if (!options.dryRun) {
        const docRef = await firebase.firestore
          .collection(FIRESTORE_COLLECTIONS.PROPERTIES)
          .add(propertyWithoutImages);
        firebaseId = docRef.id;
      } else {
        // En mode dry-run, simuler un ID Firebase
        firebaseId = `firebase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // 4. Upload des images vers Firebase Storage avec l'ID Firebase
      let images: any[] = [];
      if (!options.skipImages && bien.localPhotos && bien.localPhotos.length > 0) {
        const imageResult = await uploadImagesForProperty(
          firebase,
          bien.localPhotos,
          firebaseId, // Utiliser l'ID Firebase au lieu de bien.id
          CONFIG.IMAGES_FOLDER_PATH
        );
        images = imageResult.images;
        
        if (imageResult.stats.failed > 0) {
          console.warn(`⚠️ Échec de ${imageResult.stats.failed} images pour ${firebaseId}`);
        }

        // 5. Mettre à jour la propriété avec les images (si pas en mode dry-run)
        if (!options.dryRun && images.length > 0) {
          await firebase.firestore
            .collection(FIRESTORE_COLLECTIONS.PROPERTIES)
            .doc(firebaseId)
            .update({ images });
        }
      }

      stats.successful++;
      console.log(`✅ ${firebaseId} (${bien.id}) - ${bien.titre.substring(0, 50)}...`);

    } catch (error) {
      stats.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      stats.errors.push(`${bien.id}: ${errorMessage}`);
      console.error(`❌ ${bien.id} - Erreur: ${errorMessage}`);
    }
  }

  return stats;
}

/**
 * Charge les données des biens depuis le fichier JSON
 */
async function loadBiensData(): Promise<BienJSON[]> {
  try {
    const data = await fs.readFile(CONFIG.BIENS_JSON_PATH, 'utf-8');
    const biens = JSON.parse(data) as BienJSON[];
    
    // Filtre les biens avec un prix valide
    return biens.filter(bien => bien.prix > CONFIG.MIN_PRICE);
  } catch (error) {
    console.error('Erreur lors du chargement des biens:', error);
    throw error;
  }
}

/**
 * Affiche les statistiques finales
 */
function displayFinalStats(stats: ImportStats): void {
  console.log('\n🎉 IMPORTATION TERMINÉE');
  console.log('======================');
  console.log(`📊 Résumé:`);
  console.log(`  - Total traité: ${stats.totalProcessed}`);
  console.log(`  - Réussies: ${stats.successful} (${((stats.successful / stats.totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`  - Échecs: ${stats.failed} (${((stats.failed / stats.totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`  - Ignorées: ${stats.skipped}`);
  console.log(`  - Temps total: ${(stats.processingTime / 1000).toFixed(2)} secondes`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Erreurs (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(error => {
      console.log(`  - ${error}`);
    });
    
    if (stats.errors.length > 10) {
      console.log(`  ... et ${stats.errors.length - 10} autres erreurs`);
    }
  }
}

/**
 * Sauvegarde le rapport d'importation
 */
async function saveImportReport(stats: ImportStats): Promise<void> {
  try {
    // Créer le dossier reports s'il n'existe pas
    await fs.mkdir(CONFIG.REPORTS_FOLDER, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      ...stats
    };
    
    const reportFileName = `import-report-${Date.now()}.json`;
    const reportPath = `${CONFIG.REPORTS_FOLDER}${reportFileName}`;
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du rapport:', error);
  }
}

/**
 * Fonction CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options: ImportOptions = {};
  
  // Parsing des arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--skip-images':
        options.skipImages = true;
        break;
      case '--skip-validation':
        options.skipValidation = true;
        break;
      case '--batch-size':
        if (i + 1 < args.length) {
          const value = args[i + 1];
          if (value) {
            options.batchSize = parseInt(value);
            i++; // Avancer l'index
          }
        } else {
          console.error('❌ --batch-size nécessite une valeur');
          process.exit(1);
        }
        break;
      case '--start-from':
        if (i + 1 < args.length) {
          const value = args[i + 1];
          if (value) {
            options.startFrom = parseInt(value);
            i++; // Avancer l'index
          }
        } else {
          console.error('❌ --start-from nécessite une valeur');
          process.exit(1);
        }
        break;
      case '--limit':
        if (i + 1 < args.length) {
          const value = args[i + 1];
          if (value) {
            options.limit = parseInt(value);
            i++; // Avancer l'index
          }
        } else {
          console.error('❌ --limit nécessite une valeur');
          process.exit(1);
        }
        break;
      case '--help':
        displayHelp();
        return;
    }
  }
  
  console.log('📋 Options d\'importation:');
  console.log(JSON.stringify(options, null, 2));
  
  await importAnnonces(options);
}

/**
 * Affiche l'aide
 */
function displayHelp(): void {
  console.log(`
Usage: ts-node import-script.ts [options]

Options:
  --dry-run              Simulation sans sauvegarde
  --skip-images          Ignore l'upload des images
  --skip-validation      Ignore la validation des données
  --batch-size <number>  Taille des lots (défaut: ${CONFIG.BATCH_SIZE})
  --start-from <number>  Commence à partir de l'index donné
  --limit <number>       Limite le nombre d'annonces à traiter
  --help                 Affiche cette aide

Exemples:
  ts-node import-script.ts --dry-run
  ts-node import-script.ts --batch-size 10 --limit 100
  ts-node import-script.ts --skip-images --start-from 500
  `);
}

// Exécution du script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { importAnnonces };
export type { ImportOptions, ImportStats }; 