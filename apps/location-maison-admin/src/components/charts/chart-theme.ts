/**
 * Constantes partagées des graphiques admin.
 *
 * Les couleurs de série viennent des tokens --chart-1..3 de globals.css, qui ont
 * été validés par scripts/validate_palette.js (bande de clarté, plancher de
 * chroma, séparation protanopie/deutéranopie, plancher vision normale, contraste)
 * en mode clair ET sombre, en "toutes paires".
 *
 * Règles à ne pas casser :
 * - L'ordre des slots est le mécanisme de sécurité daltonisme : on assigne 1, 2,
 *   3 dans l'ordre, jamais en cycle, et on n'invente pas de 4e teinte. Au-delà de
 *   3 séries : replier la queue dans « Autres » ou faire des petits multiples.
 * - La couleur suit l'entité, jamais son rang : un filtre qui retire une série ne
 *   doit pas repeindre les survivantes.
 * - Jamais deux axes Y sur un même graphique.
 */

export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"] as const;

/** Nombre max de séries catégorielles autorisé par la palette validée. */
export const MAX_SERIES = SERIES.length;

/** Grille et axes volontairement discrets (le sujet, c'est la donnée). */
export const GRID_STROKE = "var(--border)";
export const AXIS_TICK = {
  fill: "var(--muted-foreground)",
  fontSize: 12,
} as const;

/** Anneau/écart dans la couleur de surface qui sépare les marques qui se touchent. */
export const SURFACE = "var(--card)";

/** Trait de 2px, jointures rondes (spec du skill dataviz). */
export const LINE_WIDTH = 2;
/** Marqueur ≥ 8px de diamètre → rayon ≥ 4. */
export const DOT_RADIUS = 4;
/** Barres plafonnées : on ne remplit jamais toute la bande, on laisse de l'air. */
export const MAX_BAR_SIZE = 24;
/** Bout de donnée arrondi 4px, carré au niveau de la ligne de base. */
export const BAR_RADIUS_HORIZONTAL: [number, number, number, number] = [0, 4, 4, 0];

/** Axe Y : nombres ronds, séparateurs de milliers. */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatFullNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** `2026-08-12` → `12 août` (les libellés d'axe doivent rester courts). */
export function formatDateKeyShort(dateKey: string): string {
  const parsed = new Date(dateKey);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(parsed);
}
