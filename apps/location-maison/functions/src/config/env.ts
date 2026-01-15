/**
 * Configuration des variables d'environnement
 * 
 * Charge les variables d'environnement depuis .env pour le développement local.
 * En production, les secrets sont gérés par Firebase Secret Manager.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Charge les variables d'environnement depuis .env
 * Cette fonction doit être appelée AVANT tout autre code qui utilise process.env
 */
export function loadEnvironmentVariables(): void {
  // Ne charger que si on est en développement local (émulateurs)
  if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV !== 'production') {
    try {
      // Après compilation, __dirname pointe vers lib/config/
      // Donc lib/config/../.. = functions/
      // Mais on peut aussi utiliser process.cwd() qui pointe vers functions/ lors de l'exécution
      const functionsDir = process.cwd();
      const envPath = path.resolve(functionsDir, '.env');
      
      // Vérifier si le fichier existe
      if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        if (!result.error) {
          console.log(`✅ Variables d'environnement chargées depuis: ${envPath}`);
          return;
        }
      }
      
      // Fallback: essayer .env.local.dev depuis la racine du projet (un niveau au-dessus de functions/)
      const rootEnvPath = path.resolve(functionsDir, '..', '.env.local.dev');
      if (fs.existsSync(rootEnvPath)) {
        const rootResult = dotenv.config({ path: rootEnvPath });
        if (!rootResult.error) {
          console.log(`✅ Variables d'environnement chargées depuis: ${rootEnvPath}`);
          return;
        }
      }
      
      console.warn('⚠️  Aucun fichier .env trouvé. Les variables d\'environnement doivent être définies autrement.');
    } catch (error: any) {
      // dotenv n'est peut-être pas disponible (en production)
      // C'est normal, les secrets seront chargés depuis Secret Manager
      console.log('ℹ️  Chargement des variables d\'environnement depuis Secret Manager (production)');
    }
  }
}

// Charger immédiatement lors de l'import de ce module
loadEnvironmentVariables();
