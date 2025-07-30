#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Lancement de la transformation des posts Facebook JSON...\n');

// Chemin vers le script JavaScript
const scriptPath = path.join(__dirname, 'transform-facebook-posts.js');

// Exécuter avec node
const child = spawn('node', [scriptPath], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Script terminé avec succès!');
  } else {
    console.log(`\n❌ Script terminé avec le code d'erreur: ${code}`);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error('❌ Erreur lors du lancement:', error);
  process.exit(1);
}); 