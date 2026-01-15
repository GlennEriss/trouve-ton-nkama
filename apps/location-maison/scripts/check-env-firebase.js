#!/usr/bin/env node

/**
 * Script de vérification des variables d'environnement Firebase
 * Vérifie que les variables pointent vers le bon projet Firebase
 */

const fs = require('fs');
const path = require('path');

// Projets Firebase attendus
const EXPECTED_PROJECTS = {
  dev: 'location-maison-dev',
  preprod: 'location-maison-preprod',
  prod: 'location-maison-prod-167da'
};

// Domaines Firebase attendus
const EXPECTED_DOMAINS = {
  dev: 'location-maison-dev.firebaseapp.com',
  preprod: 'location-maison-preprod.firebaseapp.com',
  prod: 'location-maison-prod-167da.firebaseapp.com'
};

function checkEnvFile(filePath, envName) {
  console.log(`\n🔍 Vérification de ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Fichier non trouvé`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const env = {};
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authDomain = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const expectedProject = EXPECTED_PROJECTS[envName];
  const expectedDomain = EXPECTED_DOMAINS[envName];

  const issues = [];
  
  if (projectId !== expectedProject) {
    issues.push({
      key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      current: projectId,
      expected: expectedProject,
      severity: 'error'
    });
  }

  if (authDomain !== expectedDomain) {
    issues.push({
      key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      current: authDomain,
      expected: expectedDomain,
      severity: 'error'
    });
  }

  if (issues.length === 0) {
    console.log(`   ✅ Variables correctes`);
    console.log(`   📦 Projet: ${projectId}`);
    console.log(`   🌐 Domaine: ${authDomain}`);
    return { valid: true, env };
  } else {
    console.log(`   ❌ Variables incorrectes:`);
    issues.forEach(issue => {
      console.log(`      - ${issue.key}:`);
      console.log(`        Actuel: ${issue.current || 'non défini'}`);
      console.log(`        Attendu: ${issue.expected}`);
    });
    return { valid: false, env, issues };
  }
}

function main() {
  console.log('🔍 Vérification des variables d\'environnement Firebase\n');
  console.log('='.repeat(60));

  const results = {};
  const envFiles = [
    { path: '.env.local', name: 'current' },
    { path: '.env.local.dev', name: 'dev' },
    { path: '.env.local.preprod', name: 'preprod' },
    { path: '.env.local.prod', name: 'prod' }
  ];

  envFiles.forEach(({ path: filePath, name }) => {
    if (name === 'current') {
      // Pour .env.local, on vérifie juste s'il existe et on affiche le projet
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const projectIdMatch = content.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/);
        const authDomainMatch = content.match(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=(.+)/);
        
        if (projectIdMatch || authDomainMatch) {
          const projectId = projectIdMatch ? projectIdMatch[1].trim() : 'non défini';
          const authDomain = authDomainMatch ? authDomainMatch[1].trim() : 'non défini';
          
          console.log(`\n📄 ${filePath} (fichier actuel):`);
          console.log(`   Projet: ${projectId}`);
          console.log(`   Domaine: ${authDomain}`);
          
          // Identifier l'environnement
          let detectedEnv = null;
          Object.entries(EXPECTED_PROJECTS).forEach(([env, project]) => {
            if (projectId === project) {
              detectedEnv = env;
            }
          });
          
          if (detectedEnv) {
            console.log(`   ✅ Correspond à l'environnement: ${detectedEnv.toUpperCase()}`);
          } else {
            console.log(`   ⚠️  Ne correspond à aucun environnement connu`);
            console.log(`   Environnements attendus:`);
            Object.entries(EXPECTED_PROJECTS).forEach(([env, project]) => {
              console.log(`      - ${env}: ${project}`);
            });
          }
        }
      } else {
        console.log(`\n📄 ${filePath}: ❌ Fichier non trouvé`);
      }
    } else {
      results[name] = checkEnvFile(filePath, name);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Résumé:');

  const invalidFiles = Object.entries(results).filter(([name, result]) => result && !result.valid);
  
  if (invalidFiles.length === 0) {
    console.log('   ✅ Tous les fichiers d\'environnement sont corrects');
  } else {
    console.log(`   ❌ ${invalidFiles.length} fichier(s) avec des erreurs:`);
    invalidFiles.forEach(([name]) => {
      console.log(`      - .env.local.${name}`);
    });
    console.log('\n💡 Pour corriger, copiez le bon template:');
    console.log('   cp documentation/setup/env.local.dev.template .env.local.dev');
    console.log('   cp documentation/setup/env.local.preprod.template .env.local.preprod');
    console.log('   # Puis éditez avec les vraies valeurs Firebase');
  }

  console.log('\n');
}

main();
