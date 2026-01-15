#!/usr/bin/env node

/**
 * Script pour synchroniser les variables d'environnement communes
 * depuis .env.local.prod vers .env.local.dev et .env.local.preprod
 */

const fs = require('fs');
const path = require('path');

// Variables communes à copier (sans les valeurs spécifiques Firebase)
const COMMON_VARS = [
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_CLIENT_ID',
  'FACEBOOK_CLIENT_SECRET',
  'NEXT_PUBLIC_ALGOLIA_APP_ID',
  'NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_CATALOG_TTL',
  'REDIS_PROPERTY_TTL',
  'GMAIL_SENDER_EMAIL',
  'GMAIL_OAUTH_CLIENT_ID',
  'GMAIL_OAUTH_CLIENT_SECRET',
  'GMAIL_OAUTH_REFRESH_TOKEN',
  'NEXT_PUBLIC_EMAIL_SUPPORT',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'NEXT_PUBLIC_GOOGLE_MAP_ID',
  'NEXT_PUBLIC_ENABLED_PHONE_COUNTRIES',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function updateEnvFile(targetPath, sourceEnv, keepExisting = true) {
  const targetEnv = keepExisting ? parseEnvFile(targetPath) : {};
  
  // Copier les variables communes depuis la source
  COMMON_VARS.forEach(varName => {
    if (sourceEnv[varName]) {
      targetEnv[varName] = sourceEnv[varName];
    }
  });
  
  // Lire le fichier cible pour préserver les commentaires et la structure
  let content = '';
  if (fs.existsSync(targetPath)) {
    content = fs.readFileSync(targetPath, 'utf-8');
  }
  
  // Mettre à jour ou ajouter les variables
  COMMON_VARS.forEach(varName => {
    if (sourceEnv[varName]) {
      const regex = new RegExp(`^${varName}=.*$`, 'm');
      const newLine = `${varName}=${sourceEnv[varName]}`;
      
      if (regex.test(content)) {
        // Remplacer la ligne existante
        content = content.replace(regex, newLine);
      } else {
        // Ajouter à la fin si elle n'existe pas
        content += `\n${newLine}`;
      }
    }
  });
  
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function main() {
  console.log('🔄 Synchronisation des variables d\'environnement communes...\n');
  
  const prodPath = path.join(process.cwd(), '.env.local.prod');
  const devPath = path.join(process.cwd(), '.env.local.dev');
  const preprodPath = path.join(process.cwd(), '.env.local.preprod');
  
  if (!fs.existsSync(prodPath)) {
    console.error('❌ Fichier .env.local.prod non trouvé');
    process.exit(1);
  }
  
  const prodEnv = parseEnvFile(prodPath);
  console.log(`✅ Chargé ${Object.keys(prodEnv).length} variables depuis .env.local.prod\n`);
  
  // Mettre à jour .env.local.dev
  if (fs.existsSync(devPath)) {
    console.log('📝 Mise à jour de .env.local.dev...');
    updateEnvFile(devPath, prodEnv, true);
    console.log('   ✅ Variables communes copiées\n');
  } else {
    console.log('⚠️  .env.local.dev non trouvé, création depuis le template...');
    const templatePath = path.join(process.cwd(), 'documentation/setup/env.local.dev.template');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, devPath);
      updateEnvFile(devPath, prodEnv, false);
      console.log('   ✅ Fichier créé avec variables communes\n');
    }
  }
  
  // Mettre à jour .env.local.preprod
  if (fs.existsSync(preprodPath)) {
    console.log('📝 Mise à jour de .env.local.preprod...');
    updateEnvFile(preprodPath, prodEnv, true);
    console.log('   ✅ Variables communes copiées\n');
  } else {
    console.log('⚠️  .env.local.preprod non trouvé, création depuis le template...');
    const templatePath = path.join(process.cwd(), 'documentation/setup/env.local.preprod.template');
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, preprodPath);
      updateEnvFile(preprodPath, prodEnv, false);
      console.log('   ✅ Fichier créé avec variables communes\n');
    }
  }
  
  console.log('✅ Synchronisation terminée !');
  console.log('\n💡 Note: Les variables spécifiques Firebase (PROJECT_ID, AUTH_DOMAIN, etc.)');
  console.log('   restent inchangées pour chaque environnement.\n');
}

main();
