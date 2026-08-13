"use client";

import { formatFullNumber } from "./chart-theme";

type TooltipPayloadEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  /** Reformate l'intitulé (ex. clé de date → date lisible). */
  labelFormatter?: (label: string) => string;
};

/**
 * Infobulle partagée. La pastille de couleur porte l'identité de la série ;
 * les libellés et valeurs restent en tokens de texte — jamais en couleur de
 * série (règle du skill dataviz).
 */
export function ChartTooltip({ active, payload, label, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const heading = typeof label === "string" && labelFormatter ? labelFormatter(label) : String(label ?? "");

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      {heading ? <p className="mb-1.5 text-xs font-medium text-foreground">{heading}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {typeof entry.value === "number" ? formatFullNumber(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
