import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// utils/date.ts

export function formatDateFr(createdAt: number): string {
  const date = new Date(createdAt);
  const now = new Date();

  // On isole les jours (heures mises à zéro)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((today.getTime() - target.getTime()) / msPerDay);

  // Prépare l'heure formatée
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (diffDays === 0) {
    return `aujourd'hui à ${time}`;
  }
  if (diffDays === 1) {
    return `hier à ${time}`;
  }
  if (diffDays === 2) {
    return `avant-hier à ${time}`;
  }
  if (diffDays < 7) {
    // jour de la semaine + heure
    const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
    return `${weekday} à ${time}`;
  }
  // Au-delà : date complète + heure
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}/${month}/${year} à ${time}`;
}

