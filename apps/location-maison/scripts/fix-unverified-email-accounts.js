/* eslint-disable no-console */

/**
 * Réparation ponctuelle (2026-08-18) des comptes bloqués par la panne SMTP.
 *
 * Contexte : la boîte contact@tonnkama.com ne pouvait plus s'authentifier (535 5.7.8,
 * facture impayée), donc AUCUN email de vérification n'est parti. Or `auth.config.ts`
 * refuse la connexion par mot de passe tant que `emailVerified` est faux — ces personnes
 * se sont inscrites puis sont restées enfermées dehors, sans aucun moyen de s'en sortir.
 *
 * Ce script, pour chaque compte concerné :
 *   1. passe `emailVerified` à true dans Firebase Auth (débloque la connexion),
 *   2. ajoute 10 crédits au solde EXISTANT (geste commercial, cf. décision utilisateur),
 *   3. trace l'octroi dans `credit_transactions` (type "grant", même forme que l'octroi
 *      manuel existant) pour que le solde reste auditable.
 *
 * PÉRIMÈTRE (décision utilisateur) : uniquement les comptes provider `password`, non
 * vérifiés, ET disposant d'un document `users/{uid}`. Cela exclut volontairement 15 comptes
 * de test de la phase de lancement (avril-mai 2025), dont 5 sur le domaine factice
 * `@mail.test` : ils n'ont pas de profil, ne peuvent pas recevoir d'email, et ne
 * correspondent à aucun utilisateur réel.
 *
 * ⚠️ Marquer un email « vérifié » sans que la personne ait cliqué est une entorse assumée :
 * elle est justifiée ici parce que la plateforme n'a jamais donné à ces comptes la moindre
 * chance de vérifier. À ne pas transformer en pratique courante.
 *
 * Usage :
 *   node scripts/fix-unverified-email-accounts.js            # dry-run (défaut)
 *   node scripts/fix-unverified-email-accounts.js --apply     # écriture réelle (prod)
 */

const path = require('node:path');

const APPLY = process.argv.includes('--apply');
const PROD_PROJECT_ID = 'location-maison-prod-167da';
const CREDITS_TO_GRANT = 10;
const GRANTED_BY = 'glenneriss@gmail.com';

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, '..', '.env.local.prod');
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin');
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet résolu "${process.env.FIREBASE_PROJECT_ID}", attendu "${PROD_PROJECT_ID}".`);
  }

  console.log(`Projet : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(APPLY ? 'Mode: APPLY (écriture réelle)' : 'Mode: DRY-RUN (aucune écriture)');
  console.log('');

  // 1. Recensement : comptes email/mot de passe non vérifiés.
  const candidates = [];
  let page = await admin.auth().listUsers(1000);
  while (true) {
    for (const u of page.users) {
      if (!u.email || u.emailVerified) continue;
      const providers = u.providerData.map((p) => p.providerId);
      if (!providers.includes('password')) continue;
      candidates.push({ uid: u.uid, email: u.email, created: u.metadata.creationTime });
    }
    if (!page.pageToken) break;
    page = await admin.auth().listUsers(1000, page.pageToken);
  }

  // 2. Filtre : profil Firestore existant ET adresse réellement joignable.
  //    `.test`/`.invalid`/`.example` sont des TLD réservés (RFC 2606) : aucun email ne peut
  //    y arriver, donc un compte dessus est forcément un compte de test — le « vérifier »
  //    n'aurait aucun sens et le mail d'excuse rebondirait.
  const UNDELIVERABLE_TLD = /\.(test|invalid|example|localhost)$/i;
  const targets = [];
  const skippedNoDoc = [];
  const skippedUndeliverable = [];
  for (const c of candidates) {
    if (UNDELIVERABLE_TLD.test(c.email.split('@')[1] || '')) {
      skippedUndeliverable.push(c);
      continue;
    }
    const snap = await db.collection('users').doc(c.uid).get();
    if (!snap.exists) {
      skippedNoDoc.push(c);
      continue;
    }
    const data = snap.data();
    targets.push({
      ...c,
      ref: snap.ref,
      name: [data.firstname, data.lastname].filter(Boolean).join(' ') || '(sans nom)',
      currentCredits: typeof data.credits === 'number' ? data.credits : 0,
    });
  }

  console.log(`Comptes password non vérifiés : ${candidates.length}`);
  console.log(`  → à traiter (avec profil)    : ${targets.length}`);
  console.log(`  → ignorés (sans profil)      : ${skippedNoDoc.length}`);
  console.log(`  → ignorés (domaine de test)  : ${skippedUndeliverable.length}`);
  console.log('');
  console.log('=== Comptes à débloquer ===');
  for (const t of targets) {
    console.log(
      `  ${new Date(t.created).toISOString().slice(0, 10)}  ${t.email}  (${t.name})  ` +
        `crédits ${t.currentCredits} → ${t.currentCredits + CREDITS_TO_GRANT}`,
    );
  }

  if (!APPLY) {
    console.log('');
    console.log('Dry-run : aucune écriture. Relancer avec --apply pour appliquer.');
    return;
  }

  console.log('');
  console.log('=== Application ===');
  let ok = 0;
  const failures = [];

  for (const t of targets) {
    try {
      await admin.auth().updateUser(t.uid, { emailVerified: true });

      // Solde + trace, dans une transaction : jamais l'un sans l'autre.
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(t.ref);
        const current = typeof fresh.data()?.credits === 'number' ? fresh.data().credits : 0;
        const next = current + CREDITS_TO_GRANT;

        tx.update(t.ref, {
          credits: next,
          emailVerified: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const txRef = db.collection('credit_transactions').doc();
        tx.set(txRef, {
          uid: t.uid,
          userId: t.uid,
          type: 'grant',
          status: 'success',
          credits: CREDITS_TO_GRANT,
          amount: 0,
          packId: 'smtp_outage_compensation',
          packName: 'Compensation panne email',
          provider: 'admin_script',
          service: 'manual_credit_grant',
          description: "Dédommagement : email de vérification jamais reçu (panne SMTP)",
          grantedByEmail: GRANTED_BY,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      ok += 1;
      console.log(`  ✓ ${t.email}`);
    } catch (error) {
      failures.push({ email: t.email, message: error.message });
      console.error(`  ✗ ${t.email} — ${error.message}`);
    }
  }

  console.log('');
  console.log(`Débloqués : ${ok}/${targets.length}`);
  if (failures.length > 0) {
    console.log('Échecs :', JSON.stringify(failures, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
