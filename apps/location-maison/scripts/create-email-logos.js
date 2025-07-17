#!/usr/bin/env node

/**
 * Script pour créer des logos PNG optimisés pour les emails
 * Usage: node scripts/create-email-logos.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  inputSvg: 'public/logob-02-removebg-preview.svg',
  outputDir: 'public/emails',
  logos: [
    {
      name: 'logo-email.png',
      width: 200,
      height: 200,
      description: 'Logo principal pour header'
    },
    {
      name: 'logo-email-small.png',
      width: 80,
      height: 80,
      description: 'Logo petit pour footer'
    },
    {
      name: 'logo-email-medium.png',
      width: 120,
      height: 120,
      description: 'Logo moyen pour contenu'
    }
  ]
};

// Vérifier si le fichier SVG existe
function checkInputFile() {
  if (!fs.existsSync(config.inputSvg)) {
    console.error(`❌ Fichier SVG non trouvé: ${config.inputSvg}`);
    process.exit(1);
  }
  console.log(`✅ Fichier SVG trouvé: ${config.inputSvg}`);
}

// Créer le dossier de sortie
function createOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`✅ Dossier créé: ${config.outputDir}`);
  } else {
    console.log(`ℹ️  Dossier existant: ${config.outputDir}`);
  }
}

// Vérifier si sharp est installé
async function checkSharp() {
  try {
    const sharp = require('sharp');
    console.log('✅ Sharp est installé');
    return sharp;
  } catch (error) {
    console.error('❌ Sharp n\'est pas installé');
    console.log('📦 Installation de sharp...');
    
    const { execSync } = require('child_process');
    try {
      execSync('npm install sharp --save-dev', { stdio: 'inherit' });
      console.log('✅ Sharp installé avec succès');
      return require('sharp');
    } catch (installError) {
      console.error('❌ Erreur lors de l\'installation de sharp:', installError.message);
      console.log('\n🔧 Solutions alternatives:');
      console.log('1. Installer manuellement: npm install sharp --save-dev');
      console.log('2. Utiliser un service en ligne: https://svgtopng.com/');
      console.log('3. Installer ImageMagick: brew install imagemagick');
      process.exit(1);
    }
  }
}

// Convertir SVG en PNG
async function convertSvgToPng(sharp) {
  console.log('\n🔄 Conversion des logos...');
  
  for (const logo of config.logos) {
    const outputPath = path.join(config.outputDir, logo.name);
    
    try {
      await sharp(config.inputSvg)
        .resize(logo.width, logo.height)
        .png({
          quality: 90,
          compressionLevel: 9,
          palette: true
        })
        .toFile(outputPath);
      
      // Vérifier la taille du fichier
      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ ${logo.name} créé (${logo.width}x${logo.height}px, ${sizeKB}KB) - ${logo.description}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la création de ${logo.name}:`, error.message);
    }
  }
}

// Créer un fichier de configuration
function createConfigFile() {
  const configContent = `// Configuration des logos pour les emails
export const emailLogos = {
  header: '/emails/logo-email.png',
  footer: '/emails/logo-email-small.png',
  content: '/emails/logo-email-medium.png',
  
  // URLs absolues pour production
  production: {
    header: 'https://tonnkama.com/emails/logo-email.png',
    footer: 'https://tonnkama.com/emails/logo-email-small.png',
    content: 'https://tonnkama.com/emails/logo-email-medium.png',
  }
};
`;

  const configPath = path.join(config.outputDir, 'config.ts');
  fs.writeFileSync(configPath, configContent);
  console.log(`✅ Configuration créée: ${configPath}`);
}

// Créer un fichier README pour les logos
function createLogosReadme() {
  const readmeContent = `# Logos Email

Ce dossier contient les logos optimisés pour les emails.

## Fichiers

- **logo-email.png** (200x200px) - Logo principal pour les headers
- **logo-email-small.png** (80x80px) - Logo petit pour les footers
- **logo-email-medium.png** (120x120px) - Logo moyen pour le contenu

## Utilisation

\`\`\`typescript
import { emailLogos } from './emails/config';

// En développement
const logoUrl = emailLogos.header;

// En production
const logoUrl = emailLogos.production.header;
\`\`\`

## Formats recommandés

- ✅ PNG pour les logos (transparence + compatibilité)
- ✅ JPG pour les photos de propriétés
- ❌ SVG (bloqué par Gmail/Outlook)
- ❌ WebP (support limité)

## Optimisation

Ces logos sont optimisés pour :
- Taille de fichier minimale
- Qualité maximale
- Compatibilité universelle avec tous les clients email
- Rendu sur écrans haute résolution

## Régénération

Pour régénérer les logos :
\`\`\`bash
node scripts/create-email-logos.js
\`\`\`
`;

  const readmePath = path.join(config.outputDir, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`✅ README créé: ${readmePath}`);
}

// Afficher les instructions finales
function showFinalInstructions() {
  console.log('\n🎉 Logos créés avec succès !');
  console.log('\n📋 Prochaines étapes:');
  console.log('1. Vérifiez les logos dans: public/emails/');
  console.log('2. Testez avec: npm run email');
  console.log('3. Déployez les fichiers sur votre serveur');
  console.log('4. Mettez à jour les URLs dans vos templates');
  
  console.log('\n🔧 Intégration dans vos emails:');
  console.log('```typescript');
  console.log('import { emailLogos } from "./emails/config";');
  console.log('');
  console.log('// Utilisation');
  console.log('const logoUrl = emailLogos.production.header;');
  console.log('```');
  
  console.log('\n📊 Tailles de fichiers:');
  config.logos.forEach(logo => {
    const logoPath = path.join(config.outputDir, logo.name);
    if (fs.existsSync(logoPath)) {
      const stats = fs.statSync(logoPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ${logo.name}: ${sizeKB}KB`);
    }
  });
}

// Fonction principale
async function main() {
  console.log('🚀 Création des logos email pour Trouve Ton Nkama\n');
  
  try {
    // Vérifications
    checkInputFile();
    createOutputDir();
    
    // Conversion
    const sharp = await checkSharp();
    await convertSvgToPng(sharp);
    
    // Configuration
    createConfigFile();
    createLogosReadme();
    
    // Instructions finales
    showFinalInstructions();
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la création des logos:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main, config }; 