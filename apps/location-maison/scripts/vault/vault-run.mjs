#!/usr/bin/env node
// vault-run.mjs (v2) — injecte les secrets Vault puis lance Next.js
// USAGE :
//   VAULT_PATH=logisgabon/dev  npm run dev:vault   → lit .env.local.dev si besoin
//   VAULT_PATH=logisgabon/prod npm run build:vault → lit .env.local.prod si besoin
//
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import process from 'process';
import vault from 'node-vault';

/* ------------------------------------------------------------ */
const VAULT_PATH = process.env.VAULT_PATH;           // ex. logisgabon/dev
if (!VAULT_PATH) throw new Error('VAULT_PATH env var is required');

// Détermine quel fichier .env importer en fonction de l"env
function guessEnvFile(vaultPath) {
  if (vaultPath.endsWith('/dev'))   return '.env.local.dev';
  if (vaultPath.endsWith('/prod'))  return '.env.local.prod';
  return '.env.local'; // fallback (staging, etc.)
}

// Racine du projet = deux niveaux au‑dessus de scripts/vault
const __filename = fileURLToPath(import.meta.url);
const scriptDir  = path.dirname(__filename);          // …/scripts/vault
const projectRoot = path.resolve(scriptDir, '../..'); // racine projet

const envFileName = guessEnvFile(VAULT_PATH);
const envFilePath = path.join(projectRoot, envFileName);

const importScript = path.join(scriptDir, 'import-env-to-vault.sh');

/* ------------------------------------------------------------ */
async function ensureSecretExists() {
  const client = vault({
    endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    token:    process.env.VAULT_TOKEN || 'root',
  });
  try {
    await client.read(`secret/data/${VAULT_PATH}`); // KV v2 path
    console.log(`✅  Secret secret/data/${VAULT_PATH} déjà présent`);
    return;
  } catch (err) {
    if (err.response && err.response.statusCode === 404) {
      console.log(`ℹ️  Le chemin secret/data/${VAULT_PATH} n'existe pas. Import depuis ${envFilePath}…`);
      if (!fs.existsSync(envFilePath)) {
        throw new Error(`Fichier ${envFileName} introuvable à la racine du projet.`);
      }
      // Exécute le script shell pour importer
      const res = spawnSync('bash', [importScript, envFilePath, `secret/${VAULT_PATH}`], { stdio: 'inherit' });
      if (res.status !== 0) throw new Error('Échec de l\'import des variables dans Vault');
    } else {
      throw err;
    }
  }
}

/* ------------------------------------------------------------ */
async function injectSecretsAndRun() {
  await ensureSecretExists();

  const client = vault({
    endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    token:    process.env.VAULT_TOKEN || 'root',
  });
  const { data } = await client.read(`secret/data/${VAULT_PATH}`);
  Object.entries(data.data).forEach(([k, v]) => { process.env[k] = v; });

  const [cmd, ...args] = process.argv.slice(2);
  const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
  child.on('exit', code => process.exit(code));
}

injectSecretsAndRun().catch(err => {
  console.error(`❌  Vault run failed: ${err.message}`);
  process.exit(1);
});