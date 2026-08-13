"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "./ChartTooltip";
import {
  AXIS_TICK,
  BAR_RADIUS_HORIZONTAL,
  GRID_STROKE,
  MAX_BAR_SIZE,
  SERIES,
  formatCompactNumber,
} from "./chart-theme";

type RankedBarChartProps = {
  data: Array<Record<string, string | number>>;
  /** Catégorie (nominale) — affichée sur l'axe vertical. */
  categoryKey: string;
  /** Mesure comparée. */
  valueKey: string;
  valueLabel: string;
  height?: number;
  emptyLabel?: string;
};

/**
 * Classement par magnitude (top pages, top sources…), en barres horizontales.
 *
 * Horizontal parce que les libellés sont longs (chemins d'URL) : à la verticale
 * ils seraient tronqués ou inclinés.
 *
 * Une seule couleur pour toutes les barres, volontairement : les catégories sont
 * nominales (des chemins de page), elles n'ont pas d'ordre intrinsèque. Les
 * colorer « plus foncé = plus grand » ré-encoderait en teinte ce que la longueur
 * de barre montre déjà, et gâcherait le seul canal disponible pour l'identité.
 * Une seule série ⇒ pas de légende, le titre suffit à la nommer.
 */
export function RankedBarChart({
  data,
  categoryKey,
  valueKey,
  valueLabel,
  height = 280,
  emptyLabel = "Aucune donnée sur la période.",
}: RankedBarChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
        {/* Verticale seulement : en barres horizontales, ce sont ces lignes-là
            qui aident à comparer les longueurs. */}
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          tickFormatter={formatCompactNumber}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={180}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: GRID_STROKE, fillOpacity: 0.35 }} />
        <Bar
          dataKey={valueKey}
          name={valueLabel}
          fill={SERIES[0]}
          // Bout de donnée arrondi 4px, carré côté ligne de base.
          radius={BAR_RADIUS_HORIZONTAL}
          maxBarSize={MAX_BAR_SIZE}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
