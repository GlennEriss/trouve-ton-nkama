#!/usr/bin/env ts-node
/**
 * Script de test pour diagnostiquer l'upload d'images
 */

// Chargement des variables d'environnement
import dotenv from 'dotenv';
dotenv.config();

import { initializeFirebaseAdmin } from './firebase/config';
import { uploadImageToFirebase } from './utils/image';
import * as path from 'path';
import * as fs from 'fs/promises';

async function testImageUpload() {
  console.log('🔍 Test d\'upload d\'images');
  console.log('='.repeat(40));

  try {
    // 1. Initialisation Firebase
    console.log('🔥 Initialisation Firebase...');
    const firebase = initializeFirebaseAdmin();
    console.log('✅ Firebase initialisé');

    // 2. Vérification du bucket
    console.log('🪣 Test du bucket Firebase Storage...');
    const bucket = firebase.storage.bucket();
    console.log(`✅ Bucket: ${bucket.name}`);

    // 3. Recherche d'une image test
    console.log('🖼️ Recherche d\'une image test...');
    const imagesDir = './images/';
    const files = await fs.readdir(imagesDir);
    const imageFiles = files.filter(file => 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') || 
      file.toLowerCase().endsWith('.png')
    );

    if (imageFiles.length === 0) {
      console.log('❌ Aucune image trouvée dans le dossier images/');
      return;
    }

    const testImage = imageFiles[0];
    if (!testImage) {
      console.log('❌ Impossible de sélectionner une image de test');
      return;
    }

    const testImagePath = path.join(imagesDir, testImage);
    console.log(`✅ Image test trouvée: ${testImage}`);

    // 4. Vérification de l'existence du fichier
    console.log('📂 Vérification de l\'existence du fichier...');
    const stats = await fs.stat(testImagePath);
    console.log(`✅ Fichier existe: ${stats.size} bytes`);

    // 5. Test d'upload
    console.log('⬆️ Test d\'upload...');
    console.log(`📁 Chemin local: ${testImagePath}`);
    console.log(`🔑 Property ID: test-property-id`);
    
    const result = await uploadImageToFirebase(firebase, testImagePath, 'test-property-id');

    if (result.success) {
      console.log('✅ Upload réussi !');
      console.log(`📁 Storage Path: ${result.image?.filePATH}`);
      console.log(`🔗 URL publique: ${result.image?.fileURL}`);
      
      // 6. Vérification de l'existence du fichier dans Storage
      console.log('🔍 Vérification dans Storage...');
      const file = bucket.file(result.image!.filePATH);
      const [exists] = await file.exists();
      console.log(`✅ Fichier existe dans Storage: ${exists}`);
      
    } else {
      console.log('❌ Upload échoué !');
      console.log(`🔴 Erreur: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    if (error instanceof Error) {
      console.error('📋 Stack trace:', error.stack);
    }
  }
}

// Exécution du test
if (require.main === module) {
  testImageUpload().catch(console.error);
} 