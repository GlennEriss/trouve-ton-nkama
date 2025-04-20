import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TypeProperty: Record<string, string> = {
  Home: "Maison",
  Apartment: "Appartement",
  Studio: "Studio",
  Room: "Chambre",
  Kiosk: "Kiosque",
  Shop: "Magasin",
  Desk: "Bureau",
  Building: "Immeuble",
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

