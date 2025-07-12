#!/usr/bin/env node
/**
 * Script pour corriger les villas dans Firestore
 * Objectif unique: Remplacer typeProperty "Villa" par "Home"
 */

// Chargement des variables d'environnement
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs/promises';
import { CONFIG, FIRESTORE_COLLECTIONS } from './config';
import { initializeFirebaseAdmin, testFirebaseConnection, displayFirebaseConfig } from './firebase/config';

/**
 * Statistiques de l'opération
 */
interface FixVillaStats {
  villasFound: number;
  villasUpdated: number;
  errors: string[];
  processingTime: number;
}

/**
 * Options d'opération
 */
interface FixVillaOptions {
  dryRun?: boolean;
  limit?: number;
}

/**
 * Fonction principale pour corriger les villas
 */
async function fixVillasToHome(options: FixVillaOptions = {}): Promise<void> {
  const startTime = Date.now();
  
  console.log('🏠 Correction des Villas → Home dans Firestore');
  console.log('===============================================');
  
  const stats: FixVillaStats = {
    villasFound: 0,
    villasUpdated: 0,
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

    // 3. Correction des villas
    console.log('\n🔍 Recherche des villas à corriger...');
    await updateVillasToHome(firebase, options, stats);

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    stats.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
  }

  // 4. Statistiques finales
  stats.processingTime = Date.now() - startTime;
  displayFinalStats(stats, options.dryRun || false);
  
  // 5. Sauvegarde du rapport
  await saveFixReport(stats, options);
}

/**
 * Met à jour les villas vers Home
 */
async function updateVillasToHome(firebase: any, options: FixVillaOptions, stats: FixVillaStats): Promise<void> {
  try {
    const propertiesRef = firebase.firestore.collection(FIRESTORE_COLLECTIONS.PROPERTIES);
    
    // Construire la requête
    let query = propertiesRef.where('typeProperty', '==', 'Villa');
    
    // Appliquer la limite si spécifiée
    if (options.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }
    
    const villasSnapshot = await query.get();
    stats.villasFound = villasSnapshot.size;
    
    console.log(`📊 ${stats.villasFound} villas trouvées${options.limit ? ` (limite: ${options.limit})` : ''}`);
    
    if (villasSnapshot.empty) {
      console.log('✅ Aucune villa à corriger');
      return;
    }

    // Traitement des villas
    for (const doc of villasSnapshot.docs) {
      try {
        const propertyData = doc.data();
        
        console.log(`🔄 ${options.dryRun ? '[DRY-RUN] ' : ''}Correction villa ${doc.id}...`);
        console.log(`   Titre: ${propertyData.title || 'Sans titre'}`);
        console.log(`   Localisation: ${propertyData.location?.city || 'Non spécifiée'}`);
        
        // Mise à jour vers Home
        if (!options.dryRun) {
          await doc.ref.update({ 
            typeProperty: 'Home',
            updatedAt: new Date()
          });
        }
        
        stats.villasUpdated++;
        console.log(`✅ ${options.dryRun ? '[DRY-RUN] ' : ''}Villa ${doc.id} → Home`);
        
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
}

/**
 * Affiche les statistiques finales
 */
function displayFinalStats(stats: FixVillaStats, dryRun: boolean): void {
  console.log('\n🎉 CORRECTION TERMINÉE');
  console.log('======================');
  console.log(`📊 Résumé${dryRun ? ' (DRY-RUN)' : ''}:`);
  console.log(`  - Villas trouvées: ${stats.villasFound}`);
  console.log(`  - Villas corrigées: ${stats.villasUpdated}`);
  console.log(`  - Temps total: ${(stats.processingTime / 1000).toFixed(2)} secondes`);
  console.log(`  - Taux de succès: ${stats.villasFound > 0 ? ((stats.villasUpdated / stats.villasFound) * 100).toFixed(1) : 0}%`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Erreurs (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    
    if (stats.errors.length > 10) {
      console.log(`  ... et ${stats.errors.length - 10} autres erreurs`);
    }
  }
  
  if (!dryRun && stats.villasUpdated > 0) {
    console.log('\n✅ Correction appliquée avec succès!');
    console.log('   Vérifiez dans la console Firebase que les propriétés ont bien été mises à jour.');
  }
}

/**
 * Sauvegarde le rapport de correction
 */
async function saveFixReport(stats: FixVillaStats, options: FixVillaOptions): Promise<void> {
  try {
    // Créer le dossier reports s'il n'existe pas
    await fs.mkdir(CONFIG.REPORTS_FOLDER, { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      operation: 'fix-villa-to-home',
      options,
      ...stats
    };
    
    const reportFileName = `fix-villa-report-${Date.now()}.json`;
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
  
  const options: FixVillaOptions = {};
  
  // Parsing des arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--limit':
        const nextArg = args[i + 1];
        if (!nextArg) {
          console.error('❌ Erreur: --limit doit être suivi d\'un nombre');
          process.exit(1);
        }
        const limitValue = parseInt(nextArg);
        if (!isNaN(limitValue) && limitValue > 0) {
          options.limit = limitValue;
          i++; // Skip next argument
        } else {
          console.error('❌ Erreur: --limit doit être suivi d\'un nombre positif');
          process.exit(1);
        }
        break;
      case '--help':
        displayHelp();
        return;
      default:
        console.error(`❌ Argument inconnu: ${args[i]}`);
        displayHelp();
        return;
    }
  }
  
  // Affichage des options
  console.log('📋 Options de correction:');
  console.log(JSON.stringify(options, null, 2));
  
  // Confirmation pour les opérations réelles
  if (!options.dryRun) {
    console.log('\n⚠️  ATTENTION: Cette opération va modifier les données dans Firestore!');
    console.log('   Utilisez --dry-run pour tester d\'abord.');
  }
  
  await fixVillasToHome(options);
}

/**
 * Affiche l'aide
 */
function displayHelp(): void {
  console.log(`
🏠 Fix Villa → Home - Correction des types de propriétés
======================================================

Usage: ts-node fix-villa-to-home.ts [options]

Options:
  --dry-run              Simulation sans modification
  --limit <nombre>       Limite le nombre de villas à traiter
  --help                 Affiche cette aide

Exemples:
  ts-node fix-villa-to-home.ts --dry-run
  ts-node fix-villa-to-home.ts --limit 5 --dry-run
  ts-node fix-villa-to-home.ts

Description:
  Ce script recherche toutes les propriétés avec typeProperty === "Villa"
  et les met à jour vers typeProperty === "Home" dans Firestore.
  
  En mode dry-run, aucune modification n'est effectuée.
  Les rapports sont sauvegardés dans le dossier reports/
  `);
}

// Exécution du script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { fixVillasToHome };
export type { FixVillaOptions, FixVillaStats }; 