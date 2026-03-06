#!/usr/bin/env node

/**
 * Script pour mettre à jour les variables d'environnement Firebase Admin
 * depuis le fichier service account JSON
 */

const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(
  __dirname,
  '..',
  'services-account-firebase',
  'location-maison-dev-firebase-adminsdk-fbsvc-3e00fcd22d.json'
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Fichier service account non trouvé:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Extraire les valeurs
const projectId = serviceAccount.project_id;
const clientEmail = serviceAccount.client_email;
// Pour les variables d'environnement, on doit échapper les \n
const privateKey = serviceAccount.private_key.replace(/\n/g, '\\n');

// Fichiers à mettre à jour
const envFiles = [
  path.join(__dirname, '..', '.env.local.dev'),
  path.join(__dirname, '..', '.env.local'),
];

envFiles.forEach((envFile) => {
  if (!fs.existsSync(envFile)) {
    console.warn(`⚠️  Fichier non trouvé: ${envFile}`);
    return;
  }

  let content = fs.readFileSync(envFile, 'utf8');
  let updated = false;

  // Mettre à jour ou ajouter FIREBASE_PROJECT_ID
  if (content.includes('FIREBASE_PROJECT_ID=')) {
    content = content.replace(/FIREBASE_PROJECT_ID=.*/g, `FIREBASE_PROJECT_ID=${projectId}`);
    updated = true;
  } else {
    content += `\nFIREBASE_PROJECT_ID=${projectId}\n`;
    updated = true;
  }

  // Mettre à jour ou ajouter FIREBASE_CLIENT_EMAIL
  if (content.includes('FIREBASE_CLIENT_EMAIL=')) {
    content = content.replace(/FIREBASE_CLIENT_EMAIL=.*/g, `FIREBASE_CLIENT_EMAIL=${clientEmail}`);
    updated = true;
  } else {
    content += `FIREBASE_CLIENT_EMAIL=${clientEmail}\n`;
    updated = true;
  }

  // Mettre à jour ou ajouter FIREBASE_PRIVATE_KEY
  if (content.includes('FIREBASE_PRIVATE_KEY=')) {
    // Remplacer la ligne complète (peut être sur plusieurs lignes avec des \n)
    content = content.replace(/FIREBASE_PRIVATE_KEY=.*?(?=\n[A-Z_]|\n$|$)/gs, `FIREBASE_PRIVATE_KEY="${privateKey}"`);
    updated = true;
  } else {
    content += `FIREBASE_PRIVATE_KEY="${privateKey}"\n`;
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(envFile, content, 'utf8');
    console.log(`✅ Mis à jour: ${path.basename(envFile)}`);
  }
});

console.log('\n✅ Variables d\'environnement mises à jour avec succès!');
console.log('\n📋 Valeurs mises à jour:');
console.log(`   FIREBASE_PROJECT_ID=${projectId}`);
console.log(`   FIREBASE_CLIENT_EMAIL=${clientEmail}`);
console.log(`   FIREBASE_PRIVATE_KEY=... (${privateKey.length} caractères)`);
