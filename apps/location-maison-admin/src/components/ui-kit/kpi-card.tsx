import { type ReactNode } from "react";

import { Badge } from "@trouve-ton-nkama/ui/badge";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";

type KpiCardProps = {
  label: string;
  value: string;
  helper?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: ReactNode;
};

export function KpiCard({ label, value, helper, trend, icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-primary">{icon}</span> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <div className="flex items-center justify-between gap-2">
          {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : <span />}
          {trend ? (
            <Badge variant={trend.positive ? "success" : "warning"}>{trend.value}</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
