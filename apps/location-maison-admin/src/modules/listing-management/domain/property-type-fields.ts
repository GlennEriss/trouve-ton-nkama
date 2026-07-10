/**
 * Déplacé ici depuis listing-validation.ts pour éviter une dépendance circulaire
 * (presentation → domain → presentation) : listing-validation.ts (couche presentation)
 * importe désormais ces valeurs depuis ce fichier domain, pas l'inverse.
 */
export const LISTING_TYPE_VALUES = [
  "Home",
  "Studio",
  "Apartment",
  "Desk",
  "Building",
  "Shop",
  "Kiosk",
  "Room",
  "Property",
  "Logement",
  "Villa",
  "Land",
] as const;

export type ListingTypeValue = (typeof LISTING_TYPE_VALUES)[number];

/**
 * Règle "ce champ est requis pour ce type de bien". Source unique consommée par :
 * - listing-validation.ts (superRefine du schéma Zod, validation serveur)
 * - dashboard/listings/new/page.tsx (validation + rendu du formulaire de création)
 * - dashboard/announcers/page.tsx (idem, formulaire de création pour le compte d'un annonceur)
 *
 * Avant cet extrait, la même règle métier était dupliquée indépendamment dans ces 3 fichiers
 * sous forme de chaînes de `if (typeProperty === "X")` — risque de dérive entre les copies
 * (déjà constaté : la validation client de Building ne vérifiait pas `hasParking`, contrairement
 * au serveur).
 *
 * `label` = nom technique du champ (utilisé dans les messages d'erreur, ex. "nbrRooms est
 * requis..."), `placeholder` = libellé FR affiché dans le champ de saisie (peut différer du
 * label technique, et peut différer pour la même clé selon le type — ex. `nbrRooms` = "Nombre
 * de chambres" dans le bloc logement partagé, mais "Nombre de pièces" pour Desk/Shop).
 */
export type PropertyFieldRule =
  | { key: string; kind: "number"; label: string; placeholder: string }
  | { key: string; kind: "string"; label: string; placeholder: string }
  | { key: string; kind: "boolean"; label: string; placeholder: string };

/**
 * Champs partagés par les types "logement" (Logement/Home/Studio/Apartment/Villa) — rendus par
 * les deux pages admin dans un bloc séparé du bloc "extra" propre à chaque type, pour préserver
 * la mise en page d'origine (grille à 2 colonnes dédiée).
 */
export const LOGEMENT_BASE_FIELDS: PropertyFieldRule[] = [
  { key: "nbrRooms", kind: "number", label: "nbrRooms", placeholder: "Nombre de chambres" },
  { key: "nbrKitchens", kind: "number", label: "nbrKitchens", placeholder: "Nombre de cuisines" },
  { key: "nbrBathrooms", kind: "number", label: "nbrBathrooms", placeholder: "Nombre de salles d'eau" },
  { key: "nbrToilets", kind: "number", label: "nbrToilets", placeholder: "Nombre de toilettes" },
];

export const LOGEMENT_LIKE_TYPES: ReadonlySet<ListingTypeValue> = new Set([
  "Logement",
  "Home",
  "Studio",
  "Apartment",
  "Villa",
]);

/** Champs propres à chaque type, EN PLUS du bloc logement partagé le cas échéant. */
export const PROPERTY_TYPE_EXTRA_FIELDS: Record<ListingTypeValue, PropertyFieldRule[]> = {
  Logement: [],
  Home: [
    { key: "nbrGarages", kind: "number", label: "nbrGarages", placeholder: "Nombre de garages" },
    { key: "nbrFloors", kind: "number", label: "nbrFloors", placeholder: "Nombre d'étages" },
    { key: "nbrLivingRoom", kind: "number", label: "nbrLivingRoom", placeholder: "Nombre de salons" },
  ],
  Studio: [
    { key: "nbrFloorStudio", kind: "number", label: "nbrFloorStudio", placeholder: "Étage du studio" },
    { key: "numeroStudio", kind: "string", label: "numeroStudio", placeholder: "Numéro du studio" },
  ],
  Apartment: [
    { key: "nbrFloorApartment", kind: "number", label: "nbrFloorApartment", placeholder: "Étage de l'appartement" },
    { key: "numeroApartment", kind: "string", label: "numeroApartment", placeholder: "Numéro de l'appartement" },
  ],
  Villa: [
    { key: "nbrFloors", kind: "number", label: "nbrFloors", placeholder: "Nombre d'étages" },
    { key: "nbrPiscine", kind: "number", label: "nbrPiscine", placeholder: "Nombre de piscines" },
    { key: "nbrGarages", kind: "number", label: "nbrGarages", placeholder: "Nombre de garages" },
  ],
  Desk: [
    { key: "nbrToilets", kind: "number", label: "nbrToilets", placeholder: "Nombre de toilettes" },
    { key: "nbrRooms", kind: "number", label: "nbrRooms", placeholder: "Nombre de pièces" },
  ],
  Building: [
    { key: "nbrApartments", kind: "number", label: "nbrApartments", placeholder: "Nombre d'appartements" },
    { key: "nbrFloors", kind: "number", label: "nbrFloors", placeholder: "Nombre d'étages" },
    { key: "hasParking", kind: "boolean", label: "hasParking", placeholder: "Parking" },
  ],
  Shop: [
    { key: "nbrRooms", kind: "number", label: "nbrRooms", placeholder: "Nombre de pièces" },
    // "nbrToilet" au singulier, distinct de "nbrToilets" utilisé partout ailleurs — confirmé
    // dans le schéma Zod existant, ce n'est pas une faute de frappe à corriger ici.
    { key: "nbrToilet", kind: "number", label: "nbrToilet", placeholder: "Nombre de toilettes" },
  ],
  Kiosk: [{ key: "kioskType", kind: "string", label: "kioskType", placeholder: "Type de kiosque" }],
  Room: [{ key: "roomType", kind: "string", label: "roomType", placeholder: "Type de chambre" }],
  Property: [],
  Land: [],
};

/** Liste complète (base + extra) par type — utilisée pour la validation (client et serveur). */
export const PROPERTY_TYPE_FIELD_RULES: Record<ListingTypeValue, PropertyFieldRule[]> = Object.fromEntries(
  LISTING_TYPE_VALUES.map((type) => [
    type,
    [
      ...(LOGEMENT_LIKE_TYPES.has(type) ? LOGEMENT_BASE_FIELDS : []),
      ...PROPERTY_TYPE_EXTRA_FIELDS[type],
    ],
  ]),
) as Record<ListingTypeValue, PropertyFieldRule[]>;
