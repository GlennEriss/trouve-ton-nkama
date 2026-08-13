"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./ChartTooltip";
import {
  AXIS_TICK,
  DOT_RADIUS,
  GRID_STROKE,
  LINE_WIDTH,
  MAX_SERIES,
  SERIES,
  SURFACE,
  formatCompactNumber,
  formatDateKeyShort,
} from "./chart-theme";

export type TimeSeriesSeries = {
  /** Clé dans les données. Sert aussi d'identité stable pour la couleur. */
  dataKey: string;
  label: string;
};

type TimeSeriesChartProps = {
  data: Array<Record<string, string | number>>;
  /** Max 3 : au-delà, la palette validée ne garantit plus la lisibilité daltonisme. */
  series: TimeSeriesSeries[];
  xKey?: string;
  height?: number;
  emptyLabel?: string;
};

/**
 * Évolution dans le temps, une ligne par mesure.
 *
 * Un seul axe Y, volontairement : toutes les séries passées ici doivent partager
 * la même unité (des comptages). Deux échelles différentes sur un même graphique
 * inventent une corrélation qui n'existe pas — dans ce cas, deux graphiques.
 *
 * La couleur est assignée par la position de la série dans `series`, qui est
 * stable et indépendante des valeurs : un tri ou un filtre ne repeint donc pas
 * les séries survivantes.
 */
export function TimeSeriesChart({
  data,
  series,
  xKey = "dateKey",
  height = 280,
  emptyLabel = "Aucune donnée sur la période.",
}: TimeSeriesChartProps) {
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

  const visibleSeries = series.slice(0, MAX_SERIES);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        {/* Grille discrète, horizontale seulement : elle aide la lecture des
            valeurs sans concurrencer les courbes. */}
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={formatDateKeyShort}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={formatCompactNumber}
          allowDecimals={false}
        />
        <Tooltip
          content={<ChartTooltip labelFormatter={formatDateKeyShort} />}
          cursor={{ stroke: GRID_STROKE, strokeWidth: 1 }}
        />
        {visibleSeries.length > 1 ? (
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />
        ) : null}
        {visibleSeries.map((serie, index) => (
          <Line
            key={serie.dataKey}
            type="monotone"
            dataKey={serie.dataKey}
            name={serie.label}
            stroke={SERIES[index]}
            strokeWidth={LINE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Pas de point sur chaque valeur (bruit) ; le point n'apparaît qu'au
            // survol, cerclé de la couleur de surface pour rester lisible quand
            // deux courbes se croisent.
            dot={false}
            activeDot={{ r: DOT_RADIUS, stroke: SURFACE, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
