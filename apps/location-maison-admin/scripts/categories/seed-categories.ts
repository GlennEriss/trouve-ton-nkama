/**
 * Seed idempotent de l'arbre de catégories (Lot 0, voir
 * docs/marketplace-multi-categories/07-lots-et-sequencement.md).
 *
 * Écrit directement dans Firestore (pas via l'API admin) avec des identifiants de
 * document = slug, pour que les lots suivants (backfill Lot 1, etc.) puissent référencer
 * une catégorie par un chemin prévisible (`listing_categories/immobilier`,
 * `listing_categories/vetements`, ...).
 *
 * Usage :
 *   npm run categories:seed:dev     (charge .env.local)
 *   npm run categories:seed:prod    (charge .env.local.prod)
 *   ... --dry-run                   (n'écrit rien, affiche le plan)
 */
import fs from "node:fs";
import path from "node:path";

import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/firebase/firebase-admin";
import type {
  CategoryAttributeSchemaField,
  CategoryDefaultDensity,
  CategoryImageRatio,
  CategoryLocationPrecision,
} from "@/modules/category-management/domain/types";

const COLLECTION = "listing_categories";
const SEED_ACTOR = "seed-script:categories";

type SeedCategory = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  isActive: boolean;
  attributeSchema: CategoryAttributeSchemaField[];
  imageRatio: CategoryImageRatio;
  locationPrecision: CategoryLocationPrecision;
  hasMapView: boolean;
  defaultDensity: CategoryDefaultDensity;
  defaultSort: string;
  minListingsForHomeSection: number;
};

// Type de bien -> libellé, repris tel quel de packages/core/src/domain/property-type.ts.
// "Property" et "Logement" (dans TypePropertyEnum mais sans libellé défini) sont
// volontairement exclus : ce sont des clés historiques non utilisées par un formulaire
// actif, on ne veut pas créer de catégorie fantôme pour elles.
const IMMOBILIER_CHILDREN: Array<{ slug: string; name: string }> = [
  { slug: "home", name: "Maison" },
  { slug: "apartment", name: "Appartement" },
  { slug: "studio", name: "Studio" },
  { slug: "room", name: "Chambre" },
  { slug: "kiosk", name: "Kiosque" },
  { slug: "shop", name: "Magasin" },
  { slug: "desk", name: "Bureau" },
  { slug: "building", name: "Immeuble" },
  { slug: "land", name: "Terrain" },
  { slug: "villa", name: "Villa" },
  { slug: "duplex", name: "Duplex" },
  { slug: "warehouse", name: "Entrepôt" },
];

function field(
  partial: Pick<CategoryAttributeSchemaField, "key" | "label" | "type"> &
    Partial<CategoryAttributeSchemaField>,
): CategoryAttributeSchemaField {
  const merged: CategoryAttributeSchemaField = {
    required: false,
    facetable: false,
    searchable: false,
    showOnCard: false,
    primary: false,
    ...partial,
  };
  // Firestore (Admin SDK) rejette une valeur explicite "undefined" dans un document —
  // masqué par --dry-run (JSON.stringify l'élimine silencieusement), révélé seulement à
  // l'exécution réelle. On omet la clé plutôt que de la laisser undefined.
  if (merged.options === undefined) {
    delete merged.options;
  }
  return merged;
}

const ETAT_OPTIONS = ["Neuf", "Très bon état", "Bon état", "Satisfaisant"];
const GENRE_OPTIONS = ["Femme", "Homme", "Enfant", "Unisexe"];

const MODE_CHILDREN: Array<{ slug: string; name: string; attributeSchema: CategoryAttributeSchemaField[] }> = [
  {
    slug: "vetements",
    name: "Vêtements",
    attributeSchema: [
      field({ key: "taille", label: "Taille", type: "enum", options: ["XS", "S", "M", "L", "XL", "XXL"], required: true, facetable: true, showOnCard: true, primary: true }),
      field({ key: "marque", label: "Marque", type: "text", facetable: true, searchable: true, showOnCard: true, primary: true }),
      field({ key: "genre", label: "Genre", type: "enum", options: GENRE_OPTIONS, required: true, facetable: true, primary: true }),
      field({ key: "etat", label: "État", type: "enum", options: ETAT_OPTIONS, required: true, facetable: true, showOnCard: true }),
      field({ key: "couleur", label: "Couleur", type: "text", facetable: true }),
    ],
  },
  {
    slug: "chaussures",
    name: "Chaussures",
    attributeSchema: [
      field({ key: "pointure", label: "Pointure", type: "enum", options: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"], required: true, facetable: true, showOnCard: true, primary: true }),
      field({ key: "marque", label: "Marque", type: "text", facetable: true, searchable: true, showOnCard: true, primary: true }),
      field({ key: "genre", label: "Genre", type: "enum", options: GENRE_OPTIONS, required: true, facetable: true, primary: true }),
      field({ key: "etat", label: "État", type: "enum", options: ETAT_OPTIONS, required: true, facetable: true, showOnCard: true }),
    ],
  },
  {
    slug: "parfums-beaute",
    name: "Parfums & beauté",
    attributeSchema: [
      field({ key: "contenance", label: "Contenance", type: "enum", options: ["15 ml", "30 ml", "50 ml", "75 ml", "100 ml", "125 ml", "150 ml"], required: true, facetable: true, showOnCard: true, primary: true }),
      field({ key: "marque", label: "Marque", type: "text", facetable: true, searchable: true, showOnCard: true, primary: true }),
      field({ key: "type", label: "Type", type: "enum", options: ["Eau de parfum", "Eau de toilette", "Cosmétique", "Soin"], required: true, facetable: true, primary: true }),
      field({ key: "etat", label: "État", type: "enum", options: ["Neuf sous blister", "Neuf sans blister", "Entamé"], required: true, facetable: true, showOnCard: true }),
    ],
  },
  {
    slug: "accessoires",
    name: "Accessoires",
    attributeSchema: [
      field({ key: "categorieAccessoire", label: "Type d'accessoire", type: "enum", options: ["Sac", "Bijou", "Montre", "Lunettes", "Ceinture", "Autre"], required: true, facetable: true, showOnCard: true, primary: true }),
      field({ key: "marque", label: "Marque", type: "text", facetable: true, searchable: true, showOnCard: true, primary: true }),
      field({ key: "etat", label: "État", type: "enum", options: ETAT_OPTIONS, required: true, facetable: true, showOnCard: true }),
    ],
  },
];

function buildSeedTree(): SeedCategory[] {
  const categories: SeedCategory[] = [];

  categories.push({
    id: "immobilier",
    parentId: null,
    name: "Immobilier",
    order: 0,
    isActive: true,
    attributeSchema: [],
    imageRatio: "4:3",
    locationPrecision: "exact",
    hasMapView: true,
    defaultDensity: "standard",
    defaultSort: "relevance",
    minListingsForHomeSection: 0,
  });

  IMMOBILIER_CHILDREN.forEach((child, index) => {
    categories.push({
      id: child.slug,
      parentId: "immobilier",
      name: child.name,
      order: (index + 1) * 10,
      isActive: true,
      attributeSchema: [],
      imageRatio: "4:3",
      locationPrecision: "exact",
      hasMapView: true,
      defaultDensity: "standard",
      defaultSort: "relevance",
      minListingsForHomeSection: 0,
    });
  });

  // Mode reste inactif à la création : on ne l'active côté admin qu'une fois le stock
  // constitué (Lot 2), conformément à la règle "pas de catégorie vide exposée" du
  // séquencement (docs/marketplace-multi-categories/02-page-accueil.md).
  categories.push({
    id: "mode",
    parentId: null,
    name: "Mode",
    order: 10,
    isActive: false,
    attributeSchema: [],
    imageRatio: "1:1",
    locationPrecision: "city",
    hasMapView: false,
    defaultDensity: "compact",
    defaultSort: "recent",
    minListingsForHomeSection: 12,
  });

  MODE_CHILDREN.forEach((child, index) => {
    categories.push({
      id: child.slug,
      parentId: "mode",
      name: child.name,
      order: (index + 1) * 10,
      isActive: false,
      attributeSchema: child.attributeSchema,
      imageRatio: "1:1",
      locationPrecision: "city",
      hasMapView: false,
      defaultDensity: "compact",
      defaultSort: "recent",
      minListingsForHomeSection: 12,
    });
  });

  return categories;
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
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
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
  const envFile = options.envFile ?? ".env.local";
  loadEnvFile(path.resolve(process.cwd(), envFile));

  const categories = buildSeedTree();

  if (options.dryRun) {
    console.log(JSON.stringify({ dryRun: true, count: categories.length, categories }, null, 2));
    return;
  }

  const db = getFirebaseAdminDb();
  const batch = db.batch();

  for (const category of categories) {
    const ref = db.collection(COLLECTION).doc(category.id);
    batch.set(
      ref,
      {
        ...category,
        slug: category.id,
        icon: null,
        createdBy: SEED_ACTOR,
        updatedBy: SEED_ACTOR,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  console.log(
    JSON.stringify(
      {
        seeded: categories.map((category) => ({ id: category.id, parentId: category.parentId, isActive: category.isActive })),
        count: categories.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
