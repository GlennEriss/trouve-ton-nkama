import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const TypeProperty: Record<string, string> = {
  House: "Maison",
  Apartment: "Appartement",
  Studio: "Studio",
  Room: "Chambre",
  Kiosk: "Kiosque",
  Shop: "Magasin",
  Office: "Bureau",
  Building: "Immeuble",
  // Villa: "Villa"
};

