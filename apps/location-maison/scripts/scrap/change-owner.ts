#!/usr/bin/env ts-node

/**
 * Script utilitaire pour changer facilement le propriétaire des annonces
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const CONFIG_FILE_PATH = './config.ts';

/**
 * Change le DEFAULT_CREATED_BY dans config.ts
 */
async function changeOwner(newUID: string): Promise<void> {
  try {
    console.log('🔧 Changement du propriétaire des annonces...');
    console.log(`Nouveau UID: ${newUID}`);
    
    // Lecture du fichier config.ts
    const configContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    
    // Remplacement de l'ancien UID
    const updatedContent = configContent.replace(
      /DEFAULT_CREATED_BY:\s*['"][^'"]*['"]/,
      `DEFAULT_CREATED_BY: '${newUID}'`
    );
    
    // Sauvegarde du fichier
    await fs.writeFile(CONFIG_FILE_PATH, updatedContent, 'utf-8');
    
    console.log('✅ Configuration mise à jour avec succès !');
    console.log(`📁 Fichier modifié: ${CONFIG_FILE_PATH}`);
    console.log('\n💡 Vous pouvez maintenant lancer l\'importation :');
    console.log('   npm run import:dry-run  # Pour tester');
    console.log('   npm run import          # Pour l\'import réel');
    
  } catch (error) {
    console.error('❌ Erreur lors du changement de propriétaire:', error);
    process.exit(1);
  }
}

/**
 * Affiche le propriétaire actuel
 */
async function showCurrentOwner(): Promise<void> {
  try {
    const configContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
    const match = configContent.match(/DEFAULT_CREATED_BY:\s*['"]([^'"]*)['"]/);
    
    if (match) {
      console.log(`👤 Propriétaire actuel: ${match[1]}`);
    } else {
      console.log('❌ Impossible de trouver le propriétaire actuel');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture de la configuration:', error);
  }
}

/**
 * Fonction principale CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
🔧 Script de changement de propriétaire des annonces

Usage:
  ts-node change-owner.ts <nouveau-uid>     # Change le propriétaire
  ts-node change-owner.ts --show            # Affiche le propriétaire actuel
  ts-node change-owner.ts --help            # Affiche cette aide

Exemples:
  ts-node change-owner.ts rgNMpYuXxFMpe3zeYvlxzkigPnm1
  ts-node change-owner.ts testUser123456789
  ts-node change-owner.ts --show

💡 Ce script modifie automatiquement le fichier config.ts
    `);
    return;
  }
  
  if (args[0] === '--show') {
    await showCurrentOwner();
    return;
  }
  
  const newUID = args[0];
  
  if (!newUID || newUID.trim() === '') {
    console.error('❌ Veuillez fournir un UID valide');
    process.exit(1);
  }
  
  await changeOwner(newUID.trim());
}

// Exécution du script si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { changeOwner, showCurrentOwner }; 