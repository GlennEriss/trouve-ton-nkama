/**
 * Test d'intégration RÉEL pour la Cloud Function sendVerificationEmail
 * 
 * ⚠️ ATTENTION : Ce test ENVOIE UN EMAIL RÉEL !
 * 
 * Ce test vérifie que la Cloud Function peut vraiment envoyer un email.
 * Il n'utilise PAS de mocks et envoie un email réel via SMTP.
 * 
 * Pour exécuter ce test :
 * 1. Définir la variable d'environnement : ENABLE_REAL_EMAIL_TEST=true
 * 2. Définir TEST_REAL_EMAIL avec une adresse email valide pour recevoir l'email
 * 3. Exécuter : ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=test@example.com npm test -- verification.real-email.test.ts
 * 
 * Exemple :
 *   ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=your-email@example.com npm test -- verification.real-email.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as admin from 'firebase-admin';
import type { Request, Response } from 'firebase-functions/v1';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Mocker le module admin AVANT d'importer la Cloud Function
// Cela garantit que la Cloud Function utilise l'application Firebase Admin du test
let testAdminApp: admin.app.App | undefined;

jest.mock('../../src/admin', () => {
  return {
    get adminApp() {
      return testAdminApp;
    },
    get adminDB() {
      return admin.firestore(testAdminApp!);
    },
    get adminAuth() {
      return admin.auth(testAdminApp!);
    },
    admin,
  };
});

// Importer la Cloud Function APRÈS le mock
import { sendVerificationEmail } from '../../src/email/verification';

// Charger les variables d'environnement depuis .env.local.dev
const envPath = path.resolve(process.cwd(), '..', '.env.local.dev');
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
  console.warn(`⚠️  Impossible de charger .env.local.dev: ${envResult.error.message}`);
} else {
  console.log(`📁 Variables d'environnement chargées depuis : ${envPath}`);
  // Afficher les variables chargées (masquer les valeurs sensibles)
  console.log(`   - FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅' : '❌'}`);
  console.log(`   - HOSTINGER_EMAIL_USER: ${process.env.HOSTINGER_EMAIL_USER ? '✅' : '❌'}`);
  console.log(`   - HOSTINGER_EMAIL_PASS: ${process.env.HOSTINGER_EMAIL_PASS ? '✅' : '❌'}`);
}

// Vérifier que le test est explicitement activé
const ENABLE_REAL_EMAIL_TEST = process.env.ENABLE_REAL_EMAIL_TEST === 'true';
const TEST_REAL_EMAIL = process.env.TEST_REAL_EMAIL;

// Skip tous les tests si non activé explicitement
const testIfEnabled = ENABLE_REAL_EMAIL_TEST && TEST_REAL_EMAIL ? test : test.skip;

describe('sendVerificationEmail - Test d\'envoi RÉEL d\'email', () => {
  let adminApp: admin.app.App | undefined;

  beforeAll(async () => {
    // Vérifier que le test est activé
    if (!ENABLE_REAL_EMAIL_TEST) {
      console.warn('⚠️  Test d\'envoi réel d\'email désactivé. Pour l\'activer :');
      console.warn('   ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=your-email@example.com npm test -- verification.real-email.test.ts');
      return;
    }

    if (!TEST_REAL_EMAIL) {
      throw new Error('TEST_REAL_EMAIL doit être défini pour exécuter ce test');
    }

    console.log('📧 Test d\'envoi RÉEL d\'email activé');
    console.log(`📬 Email de destination : ${TEST_REAL_EMAIL}`);

    // Initialiser Firebase Admin avec les credentials
    const projectId = process.env.FIREBASE_PROJECT_ID || 'location-maison-dev';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log(`📦 Projet Firebase : ${projectId}`);
    console.log(`📧 Client Email : ${clientEmail ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`🔑 Private Key : ${privateKey ? '✅ Configuré' : '❌ Manquant'}`);

    // Ne PAS supprimer les applications existantes car la Cloud Function pourrait les utiliser
    // Si une application existe déjà, l'utiliser
    if (admin.apps.length > 0) {
      adminApp = admin.apps[0]!;
      testAdminApp = adminApp;
      console.log('✅ Utilisation de l\'application Firebase Admin existante');
    } else if (clientEmail && privateKey) {
      // Utiliser les credentials depuis les variables d'environnement
      // Utiliser le nom par défaut pour que la Cloud Function puisse l'utiliser
      console.log('🔧 Initialisation Firebase Admin avec credentials explicites...');
      try {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        }); // Utiliser le nom par défaut pour compatibilité avec la Cloud Function
        testAdminApp = adminApp; // Mettre à jour le mock
        console.log('✅ Firebase Admin initialisé avec succès');
      } catch (error: any) {
        console.error('❌ Erreur lors de l\'initialisation Firebase Admin:', error.message);
        throw error;
      }
    } else {
      throw new Error('FIREBASE_CLIENT_EMAIL et FIREBASE_PRIVATE_KEY doivent être configurés dans .env.local.dev');
    }

    // Pour le test d'envoi réel, on n'a pas besoin de créer un utilisateur dans Firebase Auth
    // La Cloud Function peut fonctionner avec juste un email
    // On utilisera directement l'email dans les tests
    console.log(`✅ Test configuré pour envoyer un email à : ${TEST_REAL_EMAIL}`);
    console.log(`ℹ️  Note: L'utilisateur sera créé automatiquement par la Cloud Function si nécessaire`);

    // S'assurer que les secrets sont configurés
    if (!process.env.HOSTINGER_EMAIL_USER || !process.env.HOSTINGER_EMAIL_PASS) {
      console.warn('⚠️  HOSTINGER_EMAIL_USER et HOSTINGER_EMAIL_PASS doivent être configurés');
      console.warn('   Ces variables sont normalement chargées depuis Secret Manager en production');
    }
  });

  afterAll(async () => {
    // Ne pas supprimer l'utilisateur car il pourrait être utilisé pour d'autres tests
    // L'utilisateur peut être supprimé manuellement si nécessaire
    if (adminApp) {
      // Note: On ne supprime pas l'app pour éviter les conflits avec d'autres tests
    }
  });

  testIfEnabled('devrait envoyer un email RÉEL de vérification', async () => {
    if (!ENABLE_REAL_EMAIL_TEST || !TEST_REAL_EMAIL) {
      return; // Skip si non activé
    }

    // Utiliser l'UID de l'utilisateur existant (hetiwoh254@feanzier.com)
    // UID récupéré via: node scripts/check-user-exists.js hetiwoh254@feanzier.com
    const testUid = 'KfAJxUhqerZis6OGJSM9l5xxl6v2';

    const mockRequest = {
      method: 'POST',
      body: { uid: testUid },
      headers: {},
    } as Partial<Request>;

    let responseStatus = 0;
    let responseData: any = null;

    const mockResponse = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn((status: number) => {
        responseStatus = status;
        return mockResponse as Response;
      }),
      json: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
      send: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
    } as unknown as Response;

    console.log('📤 Envoi de l\'email réel...');

    // ⚠️ IMPORTANT : Ceci envoie un VRAI email, pas un mock !
    await sendVerificationEmail(
      mockRequest as Request,
      mockResponse as Response
    );

    // Vérifier que l'email a été envoyé avec succès
    expect(responseStatus).toBe(200);
    expect(responseData).toMatchObject({
      success: true,
      message: 'Email de vérification envoyé avec succès',
    });

    console.log('✅ Email envoyé avec succès !');
    console.log(`📬 Vérifiez la boîte mail : ${TEST_REAL_EMAIL}`);
    console.log('   Le lien de vérification devrait être dans l\'email reçu.');
  }, 30000); // Timeout de 30 secondes pour l'envoi SMTP

  testIfEnabled('devrait envoyer un email avec un email au lieu d\'un UID', async () => {
    if (!ENABLE_REAL_EMAIL_TEST || !TEST_REAL_EMAIL) {
      return; // Skip si non activé
    }

    const mockRequest = {
      method: 'POST',
      body: { email: TEST_REAL_EMAIL },
      headers: {},
    } as Partial<Request>;

    let responseStatus = 0;
    let responseData: any = null;

    const mockResponse = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn((status: number) => {
        responseStatus = status;
        return mockResponse as Response;
      }),
      json: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
      send: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
    } as unknown as Response;

    console.log('📤 Envoi de l\'email réel avec email...');

    // ⚠️ IMPORTANT : Ceci envoie un VRAI email, pas un mock !
    await sendVerificationEmail(
      mockRequest as Request,
      mockResponse as Response
    );

    // Si l'email est déjà vérifié, on reçoit un message différent
    if (responseStatus === 200 && responseData?.alreadyVerified) {
      console.log('ℹ️  Email déjà vérifié, aucun email envoyé');
      expect(responseData.alreadyVerified).toBe(true);
    } else {
      // Sinon, l'email devrait être envoyé
      expect(responseStatus).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        message: 'Email de vérification envoyé avec succès',
      });
      console.log('✅ Email envoyé avec succès !');
    }
  }, 30000); // Timeout de 30 secondes pour l'envoi SMTP
});
