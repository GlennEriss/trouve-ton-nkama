/**
 * Crée les comptes d'annonceurs gérés par la plateforme, proposés en accès rapide dans le
 * module Apify (dashboard/apify) pour attribuer une annonce importée en un clic.
 *
 * Ce sont des IDENTITÉS D'AFFICHAGE, pas des comptes utilisables :
 *  - aucun compte Firebase Auth n'est créé, personne ne peut s'y connecter ;
 *  - `phoneNumbers` reste vide. Inventer 30 numéros gabonais plausibles exposerait à ce qu'un
 *    numéro appartienne réellement à quelqu'un : cette personne pourrait s'inscrire par OTP et
 *    récupérer le compte, voire ses annonces via claimListingsByVerifiedPhone.
 *
 * Le contact affiché sur une annonce importée reste celui du post scrapé (apify-transform),
 * ces comptes ne changent donc rien à la joignabilité des vendeurs.
 *
 * Usage :
 *   npm run announcers:seed:dry
 *   npm run announcers:seed:prod
 */
import fs from "node:fs";
import path from "node:path";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";

const USERS_COLLECTION = "users";
const EMAIL_DOMAIN = "ttn.ga";

/** Marqueur lu par l'API annonceurs (?platform=true) pour alimenter la liste rapide Apify. */
const PLATFORM_ANNOUNCER_FLAG = "isPlatformAnnouncer";

const AGENCY_NAMES = [
  "Agence 241",
  "Agence Libreville",
  "Agence Akanda",
  "Agence Owendo",
  "Agence Estuaire",
  "Agence Port-Gentil",
  "Agence Nzeng-Ayong",
  "Agence Angondjé",
  "Agence Franceville",
  "Agence Oyem",
];

const BRAND_NAMES = [
  "Immobilier 241",
  "Nkama Immo",
  "Habitat Gabon",
  "Résidence Estuaire",
  "Toit d'Or",
  "Loger Libreville",
  "Cité Confort",
  "Mbolo Immo",
  "Akébé Résidences",
  "Gabon Home",
];

const PERSON_NAMES = [
  "Michel Obame",
  "Sylvie Nguema",
  "Patrick Mba",
  "Chantal Ella",
  "Rodrigue Bekale",
  "Nadège Mintsa",
  "Serge Ndong",
  "Estelle Moussavou",
  "Landry Ivanga",
  "Prisca Koumba",
];

type SeedAnnouncer = {
  displayName: string;
  firstname: string;
  lastname: string;
  email: string;
  kind: "agency" | "brand" | "person";
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSeed(): SeedAnnouncer[] {
  const entries: SeedAnnouncer[] = [];

  for (const name of AGENCY_NAMES) {
    entries.push({ displayName: name, firstname: name, lastname: "", email: `${slugify(name)}@${EMAIL_DOMAIN}`, kind: "agency" });
  }
  for (const name of BRAND_NAMES) {
    entries.push({ displayName: name, firstname: name, lastname: "", email: `${slugify(name)}@${EMAIL_DOMAIN}`, kind: "brand" });
  }
  for (const name of PERSON_NAMES) {
    // Les noms de personne gardent prénom/nom séparés : c'est ce que l'admin affiche par défaut
    // pour un annonceur particulier.
    const [firstname, ...rest] = name.split(" ");
    entries.push({
      displayName: name,
      firstname,
      lastname: rest.join(" "),
      email: `${slugify(name)}@${EMAIL_DOMAIN}`,
      kind: "person",
    });
  }

  return entries;
}

function parseCliArgs(argv: string[]) {
  return {
    envFile: argv.find((arg) => arg.startsWith("--env-file="))?.slice("--env-file=".length).trim(),
    dryRun: argv.includes("--dry-run"),
  };
}

function unquote(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) return value.slice(1, -1);
  return value;
}

function loadEnvFile(envFilePath: string): void {
  if (!fs.existsSync(envFilePath)) return;
  const content = fs.readFileSync(envFilePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = unquote(rawValue);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  loadEnvFile(path.resolve(process.cwd(), options.envFile ?? ".env.local"));

  const seed = buildSeed();
  const db = getFirebaseAdminDb();

  // Idempotence : l'email sert de clé naturelle, relancer le script ne duplique rien.
  const existing = new Map<string, string>();
  const snapshot = await db.collection(USERS_COLLECTION).where(PLATFORM_ANNOUNCER_FLAG, "==", true).get();
  for (const doc of snapshot.docs) {
    const email = doc.data().email;
    if (typeof email === "string") existing.set(email, doc.id);
  }

  console.log(`Projet   : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Mode     : ${options.dryRun ? "DRY-RUN" : "APPLY"}`);
  console.log(`Existants: ${existing.size} annonceur(s) plateforme déjà en base\n`);

  let created = 0;
  let skipped = 0;

  for (const entry of seed) {
    if (existing.has(entry.email)) {
      skipped += 1;
      console.log(`  = ${entry.displayName.padEnd(24)} déjà présent (${existing.get(entry.email)})`);
      continue;
    }

    if (options.dryRun) {
      created += 1;
      console.log(`  + ${entry.displayName.padEnd(24)} ${entry.email}`);
      continue;
    }

    const ref = db.collection(USERS_COLLECTION).doc();
    await ref.set({
      uid: ref.id,
      login: entry.email,
      email: entry.email,
      emailVerified: false,
      firstname: entry.firstname,
      lastname: entry.lastname,
      // pseudo porte le nom affiché sur les annonces (voir getUserDisplayName).
      pseudo: entry.displayName,
      searchableName: entry.displayName.toLowerCase(),
      birthDate: null,
      country: { name: "Gabon", code: "GA" },
      phoneNumbers: [],
      phoneNumberVerified: false,
      roles: ["User", "Announcer"],
      providers: [],
      [PLATFORM_ANNOUNCER_FLAG]: true,
      platformAnnouncerKind: entry.kind,
      metadata: {
        becomeAnnouncerAt: new Date().toISOString(),
        becomeAnnouncerSource: "admin_script:platform_announcers",
      },
      notificationParameter: {
        isNew: false,
        isAccountActivity: false,
        isNewAnnouncement: false,
        isFavoris: false,
        isPersonalizedSuggestions: false,
        isSystemUpdated: false,
      },
      favoris: [],
      credits: 0,
      state: "IN_PROGRESS",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    created += 1;
    console.log(`  + ${entry.displayName.padEnd(24)} ${entry.email}  (${ref.id})`);
  }

  console.log(`\n${created} à créer / créé(s), ${skipped} ignoré(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
