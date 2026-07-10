// Valeurs de type de bien stockées en base (clés) et leurs libellés d'affichage français.
export const TypePropertyEnum = {
  Home: "home",
  Studio: "studio",
  Apartment: "apartment",
  Desk: "desk",
  Building: "building",
  Shop: "shop",
  Kiosk: "kiosk",
  Room: "room",
  Property: "property",
  Logement: "logement",
  Villa: "villa",
  Land: "land",
  Duplex: "duplex",
  Warehouse: "warehouse",
} as const;

// Union des clés de TypePropertyEnum (ex: "Home" | "Studio" | "Apartment" | ...) — le type à
// utiliser pour typer un champ `propertyType`/`typeProperty`.
export type TypePropertyKey = keyof typeof TypePropertyEnum;

export const TypeProperty: Record<string, string> = {
  Home: "Maison",
  Apartment: "Appartement",
  Studio: "Studio",
  Room: "Chambre",
  Kiosk: "Kiosque",
  Shop: "Magasin",
  Desk: "Bureau",
  Building: "Immeuble",
  Land: "Terrain",
  Villa: "Villa",
  Duplex: "Duplex",
  Warehouse: "Entrepôt",
};

/**
 * Retourne la clé associée à une valeur donnée dans TypeProperty.
 *
 * @param value - La valeur à rechercher (ex. "Maison").
 * @returns La clé correspondante (ex. "Home"), ou undefined si aucune correspondance n'est trouvée.
 */
export function getTypePropertyKey(value: string): string | undefined {
  return Object.keys(TypeProperty).find((key) => TypeProperty[key] === value);
}
