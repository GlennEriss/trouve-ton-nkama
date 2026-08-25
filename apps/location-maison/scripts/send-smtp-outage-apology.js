/* eslint-disable no-console */

/**
 * Email d'excuse aux comptes débloqués après la panne SMTP (2026-08-18).
 *
 * Cible EXACTEMENT les comptes réparés par scripts/fix-unverified-email-accounts.js :
 * ils sont retrouvés via leur transaction de compensation
 * (`credit_transactions` où packId == "smtp_outage_compensation"), et non par un
 * nouveau recensement — ainsi le mail ne peut pas partir à quelqu'un qui n'a rien reçu,
 * ni manquer quelqu'un qui a été crédité.
 *
 * Sécurités :
 * - dry-run par défaut ; --apply pour envoyer réellement,
 * - la connexion SMTP est VÉRIFIÉE (transporter.verify()) avant le moindre envoi : inutile
 *   d'arroser 25 personnes si l'authentification échoue encore,
 * - --limit N pour un envoi de test sur les N premiers,
 * - --only <email> pour s'envoyer un exemplaire de contrôle avant la vraie diffusion.
 *
 * Usage :
 *   node scripts/send-smtp-outage-apology.js                          # dry-run
 *   node scripts/send-smtp-outage-apology.js --only glenneriss@gmail.com --apply
 *   node scripts/send-smtp-outage-apology.js --apply                  # diffusion
 */

const path = require('node:path');
const nodemailer = require('nodemailer');

const APPLY = process.argv.includes('--apply');
const PROD_PROJECT_ID = 'location-maison-prod-167da';

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const ONLY = argValue('--only');
const LIMIT = argValue('--limit') ? Number(argValue('--limit')) : undefined;

const SITE_URL = 'https://www.tonnkama.com';
const LOGIN_URL = `${SITE_URL}/signin`;
const LOGO_URL = 'https://tonnkama.com/emails/logo-email.png';
const PRIMARY = '#146B67';
const SUBJECT = 'Votre compte Trouve Ton Nkama est activé — toutes nos excuses';

function buildHtml() {
  // Greeting volontairement neutre : `firstname` contient en réalité le nom de famille
  // (inversion historique des libellés, cf. formulaires d'inscription) et les saisies sont
  // trop hétérogènes pour en extraire un prénom fiable. Se tromper de nom dans un mail
  // d'excuse dessert le message — mieux vaut ne pas nommer du tout.
  const greeting = 'Bonjour,';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#F8F9FA;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="background-color:${PRIMARY};padding:28px 24px;">
          <img src="${LOGO_URL}" alt="Trouve Ton Nkama" width="72" height="72" style="display:block;border:0;margin-bottom:10px;">
          <div style="color:#ffffff;font-size:20px;font-weight:bold;">Votre compte est activé</div>
        </td></tr>
        <tr><td style="padding:28px 24px;color:#212529;font-size:15px;line-height:1.65;">
          <p style="margin:0 0 16px;">${greeting}</p>
          <p style="margin:0 0 16px;">
            Vous vous êtes inscrit(e) sur Trouve Ton Nkama, mais notre email de confirmation
            ne vous est jamais parvenu à cause d'un incident technique de notre côté.
            Vous n'avez donc pas pu accéder à votre compte, et nous en sommes sincèrement désolés.
          </p>
          <p style="margin:0 0 16px;">
            <strong>C'est réglé : votre compte est désormais activé.</strong> Vous pouvez vous
            connecter directement avec votre adresse email et votre mot de passe, sans étape
            de vérification.
          </p>
          <p style="margin:0 0 24px;">
            Pour nous excuser du désagrément, nous avons ajouté
            <strong>10 crédits offerts</strong> à votre compte.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td align="center" style="background-color:${PRIMARY};border-radius:999px;">
              <a href="${LOGIN_URL}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">
                Se connecter
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#6C757D;font-size:13px;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
          </p>
          <p style="margin:0 0 20px;font-size:13px;word-break:break-all;">
            <a href="${LOGIN_URL}" style="color:${PRIMARY};">${LOGIN_URL}</a>
          </p>
          <p style="margin:0 0 4px;">Merci de votre patience,</p>
          <p style="margin:0;font-weight:bold;">L'équipe Trouve Ton Nkama</p>
        </td></tr>
        <tr><td align="center" style="background-color:#F8F9FA;padding:18px 24px;color:#6C757D;font-size:12px;">
          Vous recevez cet email car vous avez créé un compte sur
          <a href="${SITE_URL}" style="color:${PRIMARY};">tonnkama.com</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildText() {
  const greeting = 'Bonjour,';
  return `${greeting}

Vous vous etes inscrit(e) sur Trouve Ton Nkama, mais notre email de confirmation ne vous est
jamais parvenu a cause d'un incident technique de notre cote. Vous n'avez donc pas pu acceder
a votre compte, et nous en sommes sincerement desoles.

C'est regle : votre compte est desormais active. Vous pouvez vous connecter directement avec
votre adresse email et votre mot de passe, sans etape de verification.

Pour nous excuser du desagrement, nous avons ajoute 10 credits offerts a votre compte.

Se connecter : ${LOGIN_URL}

Merci de votre patience,
L'equipe Trouve Ton Nkama`;
}

async function buildTransporter() {
  const primaryUser = process.env.HOSTINGER_EMAIL_USER;
  const primaryPass = process.env.HOSTINGER_EMAIL_PASS;
  const fallbackUser = process.env.FALLBACK_EMAIL_USER;
  const fallbackPass = process.env.FALLBACK_EMAIL_PASS;

  const candidates = [];
  if (primaryUser && primaryPass) {
    candidates.push({
      label: 'principal (Hostinger)',
      user: primaryUser,
      config: { host: 'smtp.hostinger.com', port: 465, secure: true, auth: { user: primaryUser, pass: primaryPass } },
    });
  }
  if (fallbackUser && fallbackPass) {
    candidates.push({
      label: 'secours',
      user: fallbackUser,
      config: {
        host: process.env.FALLBACK_SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.FALLBACK_SMTP_PORT || 465),
        secure: true,
        auth: { user: fallbackUser, pass: fallbackPass },
      },
    });
  }

  for (const c of candidates) {
    const transporter = nodemailer.createTransport(c.config);
    try {
      await transporter.verify();
      console.log(`✓ SMTP ${c.label} opérationnel (${c.user})`);
      return { transporter, from: `"Trouve Ton Nkama" <${c.user}>` };
    } catch (error) {
      console.log(`✗ SMTP ${c.label} indisponible : ${error.code || ''} ${error.message}`);
    }
  }
  return null;
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, '..', '.env.local.prod');
  const { initFirestoreAdmin } = require('./openstreetmap/firestore-admin');
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet résolu "${process.env.FIREBASE_PROJECT_ID}".`);
  }
  console.log(`Projet : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(APPLY ? 'Mode: APPLY (envoi réel)' : 'Mode: DRY-RUN (aucun envoi)');
  console.log('');

  // Destinataires = comptes ayant reçu la compensation.
  const grants = await db
    .collection('credit_transactions')
    .where('packId', '==', 'smtp_outage_compensation')
    .get();

  let recipients = [];
  for (const doc of grants.docs) {
    const uid = doc.data().uid;
    try {
      const authUser = await admin.auth().getUser(uid);
      if (!authUser.email) continue;
      const profile = await db.collection('users').doc(uid).get();
      const firstName = profile.exists ? (profile.data().lastname || profile.data().firstname || '') : '';
      recipients.push({ uid, email: authUser.email, firstName: String(firstName).trim().split(' ')[0] || '' });
    } catch (error) {
      console.error(`  ⚠️ Compte introuvable pour uid ${uid} : ${error.message}`);
    }
  }

  if (ONLY) recipients = recipients.filter((r) => r.email.toLowerCase() === ONLY.toLowerCase());
  if (LIMIT) recipients = recipients.slice(0, LIMIT);

  console.log(`Destinataires : ${recipients.length}`);
  for (const r of recipients) console.log(`   ${r.email}  (${r.firstName || 'sans prénom'})`);
  console.log('');
  console.log(`Objet : ${SUBJECT}`);
  console.log(`Lien de connexion : ${LOGIN_URL}`);

  const smtp = await buildTransporter();
  if (!smtp) {
    console.log('');
    console.log('❌ Aucun SMTP opérationnel. Renseigne FALLBACK_EMAIL_USER / FALLBACK_EMAIL_PASS');
    console.log('   (mot de passe d\'application Gmail) ou rétablis la boîte Hostinger.');
    process.exit(1);
  }

  if (!APPLY) {
    console.log('');
    console.log('Dry-run : aucun envoi. Relancer avec --apply.');
    return;
  }

  console.log('');
  console.log('=== Envoi ===');
  let sent = 0;
  const failures = [];
  for (const r of recipients) {
    try {
      await smtp.transporter.sendMail({
        from: smtp.from,
        to: r.email,
        subject: SUBJECT,
        text: buildText(),
        html: buildHtml(),
      });
      sent += 1;
      console.log(`  ✓ ${r.email}`);
      await new Promise((resolve) => setTimeout(resolve, 1200)); // ménage les quotas SMTP
    } catch (error) {
      failures.push({ email: r.email, message: error.message });
      console.error(`  ✗ ${r.email} — ${error.message}`);
    }
  }

  console.log('');
  console.log(`Envoyés : ${sent}/${recipients.length}`);
  if (failures.length) console.log('Échecs :', JSON.stringify(failures, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
