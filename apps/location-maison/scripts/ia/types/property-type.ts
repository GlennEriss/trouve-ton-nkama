//Type property enum
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
    Villa: 'villa',
    Land: 'land'
  } as const;

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
    // Villa: "Villa"
  };
  
  /**
   * Retourne la clé associée à une valeur donnée dans TypeProperty.
   *
   * @param value - La valeur à rechercher (ex. "Maison").
   * @returns La clé correspondante (ex. "Home"), ou undefined si aucune correspondance n'est trouvée.
   */
  export function getTypePropertyKey(value: string): string | undefined {
    return Object.keys(TypeProperty).find(key => TypeProperty[key] === value);
  } 