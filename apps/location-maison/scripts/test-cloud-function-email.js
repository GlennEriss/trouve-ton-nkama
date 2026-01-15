/* eslint-disable no-console */
/**
 * Script pour tester la Cloud Function d'envoi d'email de vérification
 * 
 * Usage:
 *   node scripts/test-cloud-function-email.js <uid|email>
 */

const path = require("path");
const dotenv = require("dotenv");

// Charger les variables d'environnement depuis .env.local.dev
const envPath = path.join(__dirname, "..", ".env.local.dev");
dotenv.config({ path: envPath });

async function testCloudFunction(uidOrEmail) {
  try {
    const isUid = !uidOrEmail.includes('@');
    const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL || 
      `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'location-maison-dev'}.cloudfunctions.net/sendVerificationEmail`;

    console.log(`🔍 Test de la Cloud Function d'envoi d'email`);
    console.log(`📦 Projet: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'location-maison-dev'}`);
    console.log(`🔗 URL: ${functionUrl}`);
    console.log(`👤 ${isUid ? 'UID' : 'Email'}: ${uidOrEmail}\n`);

    const body = isUid 
      ? { uid: uidOrEmail }
      : { email: uidOrEmail };

    console.log(`📤 Envoi de la requête...`);
    console.log(`   Body:`, JSON.stringify(body, null, 2));

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`\n📥 Réponse reçue:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`   Body (JSON):`, JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log(`   Body (text):`, responseText);
    }

    if (response.ok) {
      console.log(`\n✅ Succès ! Email envoyé avec succès`);
      if (responseData?.verificationLink) {
        console.log(`🔗 Lien de vérification: ${responseData.verificationLink}`);
      }
    } else {
      console.log(`\n❌ Erreur: ${response.status} ${response.statusText}`);
      if (responseData?.error) {
        console.log(`   Détails: ${responseData.error}`);
      }
    }

  } catch (error) {
    console.error(`\n❌ Erreur lors du test:`, error);
    if (error.message) {
      console.error(`   Message: ${error.message}`);
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

const uidOrEmail = process.argv[2];

if (!uidOrEmail) {
  console.error('❌ Erreur: Veuillez fournir un UID ou un email');
  console.log('Usage: node scripts/test-cloud-function-email.js <uid|email>');
  console.log('\nExemples:');
  console.log('  node scripts/test-cloud-function-email.js KfAJxUhqerZis6OGJSM9l5xxl6v2');
  console.log('  node scripts/test-cloud-function-email.js hetiwoh254@feanzier.com');
  process.exit(1);
}

testCloudFunction(uidOrEmail);
