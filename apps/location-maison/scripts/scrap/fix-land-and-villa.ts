#!/usr/bin/env node
/**
 * Script pour corriger les types de propriétés dans Firestore :
 * 1. Ajouter uniquement les terrains (type_bien: "Terrain")
 * 2. Remplacer typeProperty "Villa" par "Home" dans les documents existants
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
import { validateBienJSON } from './utils/validator';
import { uploadImagesForProperty } from './utils/image';

/**
 * Statistiques d'opération
 */
interface OperationStats {
  terrainAdded: number;
  villaUpdated: number;
  errors: string[];
  processingTime: number;
}

/**
 * Résultat de mise à jour des villas
 */
interface VillaUpdateResult {
  updated: number;
  errors: string[];
}

/**
 * Résultat d'ajout de terrains
 */
interface TerrainAddResult {
  added: number;
  errors: string[];
}

/**
 * Options d'opération
 */
interface OperationOptions {
  dryRun?: boolean;
  addTerrain?: boolean;
  updateVilla?: boolean;
}

/**
 * Fonction principale
 */
async function fixLandAndVilla(options: OperationOptions = {}): Promise<void> {
  const startTime = Date.now();
  
  console.log('🔧 Correction des types de propriétés dans Firestore');
  console.log('===================================================');
  
  const stats: OperationStats = {
    terrainAdded: 0,
    villaUpdated: 0,
    errors: [],
    processingTime: 0
  };

  try {
    // 1. Vérification de la configuration
    console.log('\n📋 Vérification de la configuration...');
    displayFirebaseConfig();
    
    // 2. Test de la connexion Firebase
    console.log('\n🔥 Test de la connexion Firebase...');
    const firebaseConnected = await testFirebaseConnection();
    if (!firebaseConnected) {
      throw new Error('Impossible de se connecter à Firebase');
    }

    const firebase = initializeFirebaseAdmin();

    // 3. Mise à jour des villas existantes vers Home
    if (options.updateVilla !== false) {
      console.log('\n🏠 Mise à jour des Villas vers Home...');
      const villaStats = await updateVillasToHome(firebase, options.dryRun || false);
      stats.villaUpdated = villaStats.updated;
      stats.errors.push(...villaStats.errors);
    }

    // 4. Ajout des terrains
    if (options.addTerrain !== false) {
      console.log('\n🌍 Ajout des terrains...');
      const terrainStats = await addTerrainsOnly(firebase, options.dryRun || false);
      stats.terrainAdded = terrainStats.added;
      stats.errors.push(...terrainStats.errors);
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    stats.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
  }

  // 5. Statistiques finales
  stats.processingTime = Date.now() - startTime;
  displayFinalStats(stats, options.dryRun || false);
  
  // 6. Sauvegarde du rapport
  await saveOperationReport(stats, options);
}

/**
 * Met à jour toutes les villas existantes vers Home
 */
async function updateVillasToHome(firebase: any, dryRun: boolean): Promise<VillaUpdateResult> {
  const stats: VillaUpdateResult = { updated: 0, errors: [] };
  
  try {
    const propertiesRef = firebase.firestore.collection(FIRESTORE_COLLECTIONS.PROPERTIES);
    const villasSnapshot = await propertiesRef.where('typeProperty', '==', 'Villa').get();
    
    console.log(`📊 ${villasSnapshot.size} villas trouvées à mettre à jour`);
    
    if (villasSnapshot.empty) {
      console.log('✅ Aucune villa à mettre à jour');
      return stats;
    }

    for (const doc of villasSnapshot.docs) {
      try {
        if (!dryRun) {
          await doc.ref.update({ typeProperty: 'Home' });
        }
        
        stats.updated++;
        console.log(`✅ ${dryRun ? '[DRY-RUN] ' : ''}Villa ${doc.id} → Home`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        stats.errors.push(`Villa ${doc.id}: ${errorMessage}`);
        console.error(`❌ Erreur villa ${doc.id}: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    stats.errors.push(`Requête villas: ${errorMessage}`);
    console.error('❌ Erreur lors de la requête des villas:', error);
  }
  
  return stats;
}

/**
 * Ajoute uniquement les terrains depuis le JSON
 */
async function addTerrainsOnly(firebase: any, dryRun: boolean): Promise<TerrainAddResult> {
  const stats: TerrainAddResult = { added: 0, errors: [] };
  
  try {
    // Chargement des données
    const biens = await loadBiensData();
    const localisations = await loadLocationsData(CONFIG.LOCALISATIONS_JSON_PATH);
    
    // Filtrer uniquement les terrains
    const terrains = biens.filter(bien => bien.type_bien === "Terrain");
    
    console.log(`📊 ${terrains.length} terrains trouvés à ajouter`);
    
    if (terrains.length === 0) {
      console.log('✅ Aucun terrain à ajouter');
      return stats;
    }

    for (const terrain of terrains) {
      try {
        // Validation
        const validation = validateBienJSON(terrain);
        if (!validation.isValid) {
          stats.errors.push(`Terrain ${terrain.id}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Enrichissement de la localisation
        const locationData = findLocationByOriginal(localisations, terrain.localisation);
        const location = locationData 
          ? mapLocationFromPhoton(locationData)
          : createDefaultLocation(terrain.localisation);

        // Mapping vers le format Firestore (sans images pour l'instant)
        const propertyWithoutImages = mapPropertyByType(terrain, location, []);

        // Sauvegarde dans Firestore
        let firebaseId: string;
        if (!dryRun) {
          const docRef = await firebase.firestore
            .collection(FIRESTORE_COLLECTIONS.PROPERTIES)
            .add(propertyWithoutImages);
          firebaseId = docRef.id;
        } else {
          firebaseId = `firebase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Upload des images si elles existent
        if (terrain.localPhotos && terrain.localPhotos.length > 0) {
          const imageResult = await uploadImagesForProperty(
            firebase,
            terrain.localPhotos,
            firebaseId,
            CONFIG.IMAGES_FOLDER_PATH
          );

          // Mettre à jour avec les images
          if (!dryRun && imageResult.images.length > 0) {
            await firebase.firestore
              .collection(FIRESTORE_COLLECTIONS.PROPERTIES)
              .doc(firebaseId)
              .update({ images: imageResult.images });
          }

          console.log(`📸 ${imageResult.images.length} images uploadées pour le terrain`);
        }

        stats.added++;
        console.log(`✅ ${dryRun ? '[DRY-RUN] ' : ''}Terrain ${firebaseId} (${terrain.id}) ajouté`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        stats.errors.push(`Terrain ${terrain.id}: ${errorMessage}`);
        console.error(`❌ Erreur terrain ${terrain.id}: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    stats.errors.push(`Chargement terrains: ${errorMessage}`);
    console.error('❌ Erreur lors du chargement des terrains:', error);
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
function displayFinalStats(stats: OperationStats, dryRun: boolean): void {
  console.log('\n🎉 OPÉRATION TERMINÉE');
  console.log('====================');
  console.log(`📊 Résumé${dryRun ? ' (DRY-RUN)' : ''}:`);
  console.log(`  - Villas mises à jour vers Home: ${stats.villaUpdated}`);
  console.log(`  - Terrains ajoutés: ${stats.terrainAdded}`);
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
 * Sauvegarde le rapport d'opération
 */
async function saveOperationReport(stats: OperationStats, options: OperationOptions): Promise<void> {
  try {
    // Créer le dossier reports s'il n'existe pas
    await fs.mkdir(CONFIG.REPORTS_FOLDER, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      operation: 'fix-land-and-villa',
      options,
      ...stats
    };
    
    const reportFileName = `fix-land-villa-report-${Date.now()}.json`;
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
  
  const options: OperationOptions = {};
  
  // Parsing des arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--only-terrain':
        options.addTerrain = true;
        options.updateVilla = false;
        break;
      case '--only-villa':
        options.addTerrain = false;
        options.updateVilla = true;
        break;
      case '--help':
        displayHelp();
        return;
    }
  }
  
  console.log('📋 Options d\'opération:');
  console.log(JSON.stringify(options, null, 2));
  
  await fixLandAndVilla(options);
}

/**
 * Affiche l'aide
 */
function displayHelp(): void {
  console.log(`
Usage: ts-node fix-land-and-villa.ts [options]

Options:
  --dry-run          Simulation sans modification
  --only-terrain     Ajouter uniquement les terrains
  --only-villa       Mettre à jour uniquement les villas vers Home
  --help             Affiche cette aide

Par défaut: Fait les deux opérations (terrain + villa)

Exemples:
  ts-node fix-land-and-villa.ts --dry-run
  ts-node fix-land-and-villa.ts --only-terrain
  ts-node fix-land-and-villa.ts --only-villa
  `);
}

// Exécution du script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { fixLandAndVilla };
export type { OperationOptions, OperationStats }; 