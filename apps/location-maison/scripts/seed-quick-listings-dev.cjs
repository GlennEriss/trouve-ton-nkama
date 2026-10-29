/* Fixtures visuelles seulement : aucun paiement réel, aucune modification de compte. */
const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const PROJECT = 'location-maison-dev';
const MARKER = 'quick-listings-visual-20261028';

async function main() {
  if (!process.argv.includes('--confirm-dev')) throw new Error('Confirmation --confirm-dev requise');
  const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env.local.dev')));
  if (env.FIREBASE_PROJECT_ID !== PROJECT || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT) throw new Error('Projet non DEV interdit');
  if (!env.FIREBASE_CLIENT_EMAIL?.endsWith(`@${PROJECT}.iam.gserviceaccount.com`)) throw new Error('Compte de service non DEV interdit');
  const app = admin.initializeApp({ projectId: PROJECT, credential: admin.credential.cert({ projectId: PROJECT, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) }, MARKER);
  try {
    const user = await app.auth().getUserByEmail('mobile-e2e@example.test');
    const db = app.firestore();
    const fixtures = [
      { id: 'test-dev-quick-studio-20261028', city: 'Libreville', neighborhood: 'Nzeng-Ayong', description: '[TEST DEV — OFFRE FICTIVE, NE PAS CONTACTER]\nStudio de démonstration : une chambre, un coin cuisine et une douche intérieure.\nLoyer fictif : 100 000 FCFA, charges comprises.\nCette annonce sert uniquement à vérifier l’affichage sans photo. Aucun logement réel n’est proposé.' },
      { id: 'test-dev-quick-maison-20261028', city: 'Owendo', neighborhood: 'SNI', description: '[TEST DEV — OFFRE FICTIVE, NE PAS CONTACTER]\nMaison de démonstration avec deux chambres, salon, cuisine, douche/WC et terrasse. Concession clôturée, accès véhicule.\nLoyer fictif : 180 000 FCFA. Conditions fictives : un mois de loyer et un mois de caution.\nDescription longue destinée à vérifier les retours à la ligne, les cartes et les précautions avant engagement.\nAucune visite ni transaction réelle ne doit être organisée.' },
    ];
    await db.runTransaction(async tx => {
      const refs = fixtures.map(f => db.collection('quick_listings').doc(f.id));
      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      snapshots.forEach(snapshot => {
        if (snapshot.exists && snapshot.data().testFixture !== MARKER) throw new Error('Collision avec un document non fixture');
      });
      fixtures.forEach((fixture, index) => {
        if (snapshots[index].exists) return; // Ne pas écraser les modifications de test manuel.
        tx.create(refs[index], { ...fixture, province: 'Estuaire', ownerUid: user.uid, contactPhone: '+24160000000', paymentStatus: 'confirmed', moderationStatus: 'APPROVED', state: 'IN_PROGRESS', testFixture: MARKER, paymentSimulated: true, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), publishedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
    });
    for (const fixture of fixtures) {
      const saved = await db.collection('quick_listings').doc(fixture.id).get();
      if (saved.data()?.testFixture !== MARKER) throw new Error('Vérification fixture échouée');
      console.log(`http://localhost:3000/annonces-rapides/${fixture.id}`);
    }
  } finally { await app.delete(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
