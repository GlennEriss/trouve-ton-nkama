/**
 * Configuration Firebase Admin SDK pour l'importation
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Configuration Firebase Admin
 */
export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

/**
 * Services Firebase
 */
export interface FirebaseServices {
  firestore: ReturnType<typeof getFirestore>;
  storage: ReturnType<typeof getStorage>;
}

/**
 * Initialise Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): FirebaseServices {
  // Vérifie si Firebase est déjà initialisé
  if (getApps().length === 0) {
    const config = getFirebaseConfig();
    
    initializeApp({
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey.replace(/\\n/g, '\n'),
      }),
      storageBucket: config.storageBucket,
    });
  }

  return {
    firestore: getFirestore(),
    storage: getStorage(),
  };
}

/**
 * Récupère la configuration Firebase depuis les variables d'environnement
 */
function getFirebaseConfig(): FirebaseConfig {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];

  // Vérifie que toutes les variables d'environnement sont présentes
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
  }

  // Pour le storage bucket, utilise FIREBASE_STORAGE_BUCKET ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('Variable d\'environnement manquante: FIREBASE_STORAGE_BUCKET ou NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!,
    storageBucket: storageBucket,
  };
}

/**
 * Teste la connexion Firebase
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const { firestore } = initializeFirebaseAdmin();
    
    // Test simple : lire les règles de sécurité
    const testDoc = await firestore.collection('_test').doc('connection').get();
    console.log('✅ Connexion Firebase réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Firebase:', error);
    return false;
  }
}

/**
 * Affiche les informations de configuration (masquées)
 */
export function displayFirebaseConfig(): void {
  try {
    const config = getFirebaseConfig();
    console.log('🔥 Configuration Firebase:');
    console.log(`  Project ID: ${config.projectId}`);
    console.log(`  Client Email: ${config.clientEmail}`);
    console.log(`  Private Key: ${config.privateKey.substring(0, 50)}...`);
    console.log(`  Storage Bucket: ${config.storageBucket}`);
  } catch (error) {
    console.error('❌ Erreur de configuration Firebase:', error);
  }
} 