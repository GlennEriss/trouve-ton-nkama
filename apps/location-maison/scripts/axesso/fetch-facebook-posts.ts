import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as yaml from 'js-yaml';
import axios from 'axios';
import facebookPages from './facebook-pages';

// Chargement des variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '.env') });

const AXESSO_API_URL = 'http://api.axesso.de/fba/v2/facebook-lookup-posts';
const PRIMARY_KEY = process.env.PRIMARY_KEY;
const SECONDARY_KEY = process.env.SECONDARY_KEY;

const AXESSO_YAML_PATH = path.resolve(__dirname, 'axesso.yaml');
const CURSORS_PATH = path.resolve(__dirname, 'cursors.json');
const API_USAGE_PATH = path.resolve(__dirname, 'api-usage.json');
const PROPERTY_PATH = path.resolve(__dirname, 'property.json');

// Chargement de la configuration YAML
async function loadYamlConfig() {
  const yamlContent = await fs.readFile(AXESSO_YAML_PATH, 'utf-8');
  return yaml.load(yamlContent) as {
    plan: string;
    requete_par_mois: number;
    appel_api_par_min: number;
    start_time?: string;
    posts_par_page?: number;
  };
}

// Chargement ou initialisation d'un fichier JSON
async function loadJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

// Sauvegarde d'un fichier JSON
async function saveJsonFile<T>(filePath: string, data: T) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Vérification des quotas d'appels API
function checkApiQuota(apiUsage: number[], limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = apiUsage.filter(ts => now - ts < windowMs);
  return recent.length < limit;
}

// Ajout d'un timestamp d'appel API
function addApiUsage(apiUsage: number[]): number[] {
  return [...apiUsage, Date.now()];
}

// Fonction principale
async function main() {
  const config = await loadYamlConfig();
  const startTime = config.start_time;
  const postsParPage = config.posts_par_page;
  const cursors = await loadJsonFile<Record<string, { firstCursor?: string; lastCursor?: string }>>(CURSORS_PATH, {});
  const apiUsage = await loadJsonFile<number[]>(API_USAGE_PATH, []);
  const properties = await loadJsonFile<any[]>(PROPERTY_PATH, []);

  let apiUsageUpdated = [...apiUsage];
  let propertiesUpdated = [...properties];
  let cursorsUpdated = { ...cursors };

  console.log('PRIMARY_KEY chargé (début masqué):', PRIMARY_KEY ? PRIMARY_KEY.slice(0, 6) + '...' : 'NON DÉFINI');

  for (const pageId of facebookPages) {
    // Respect des quotas par minute et par mois
    const usageLastMinute = apiUsageUpdated.filter(ts => Date.now() - ts < 60 * 1000);
    const usageLastMonth = apiUsageUpdated.filter(ts => Date.now() - ts < 31 * 24 * 60 * 60 * 1000);
    if (usageLastMinute.length >= config.appel_api_par_min) {
      console.log('Limite d\'appels API par minute atteinte, pause de 60s...');
      await new Promise(res => setTimeout(res, 60 * 1000));
    }
    if (usageLastMonth.length >= config.requete_par_mois) {
      console.log('Limite d\'appels API par mois atteinte, arrêt du script.');
      break;
    }

    let cursor = cursorsUpdated[pageId]?.lastCursor;
    let hasNext = true;
    let firstCursor: string | undefined = undefined;
    let lastCursor: string | undefined = undefined;

    while (hasNext) {
      // Construction de l'URL
      const params: Record<string, string> = { pageId };
      if (startTime) {
        // Conversion ISO 8601 -> epoch (secondes)
        const epoch = Math.floor(new Date(startTime).getTime() / 1000);
        params.startTime = String(epoch);
      }
      if (postsParPage) params.limit = String(postsParPage);
      if (cursor) params.cursor = cursor;
      const url = AXESSO_API_URL + '?' + new URLSearchParams(params).toString();
      try {
        const response = await axios.get(url, {
          headers: {
            'cache-control': 'no-cache',
            'axesso-api-key': PRIMARY_KEY,
            'x-api-key': PRIMARY_KEY,
          },
        });
        apiUsageUpdated = addApiUsage(apiUsageUpdated);
        const data = response.data;
        if (Array.isArray(data.posts)) {
          propertiesUpdated.push(...data.posts);
        }
        // Gestion des curseurs
        if (!firstCursor && data.firstCursor) firstCursor = data.firstCursor;
        if (data.lastCursor) lastCursor = data.lastCursor;
        if (data.nextCursor) {
          cursor = data.nextCursor;
        } else {
          hasNext = false;
        }
        // Respect du quota par minute
        if (!checkApiQuota(apiUsageUpdated, config.appel_api_par_min, 60 * 1000)) {
          console.log('Quota minute atteint, pause de 60s...');
          await new Promise(res => setTimeout(res, 60 * 1000));
        }
      } catch (err: any) {
        console.error(`Erreur lors du fetch pour la page ${pageId} :`, err.message);
        hasNext = false;
      }
    }
    // Mise à jour des curseurs pour la page
    cursorsUpdated[pageId] = {
      firstCursor: firstCursor || cursorsUpdated[pageId]?.firstCursor,
      lastCursor: lastCursor || cursorsUpdated[pageId]?.lastCursor,
    };
    // Sauvegarde intermédiaire
    await saveJsonFile(CURSORS_PATH, cursorsUpdated);
    await saveJsonFile(PROPERTY_PATH, propertiesUpdated);
    await saveJsonFile(API_USAGE_PATH, apiUsageUpdated);
  }
  // Sauvegarde finale
  await saveJsonFile(CURSORS_PATH, cursorsUpdated);
  await saveJsonFile(PROPERTY_PATH, propertiesUpdated);
  await saveJsonFile(API_USAGE_PATH, apiUsageUpdated);
  console.log('Script terminé.');
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
}); 