'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trouve-ton-nkama/ui/card';
import { Badge } from '@trouve-ton-nkama/ui/badge';
import { Button } from '@trouve-ton-nkama/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface QuotaStatus {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  count: number;
  limit: number;
  softLimit: number;
  alertAt: number;
  usageRatio: number;
  mode: 'ALGOLIA' | 'MEILISEARCH_ONLY';
  overSoftLimit: boolean;
  overLimit: boolean;
  enforced: boolean;
  switchedAt: string | null;
  lastAlertAt: string | null;
  updatedAt: string | null;
}

const nf = new Intl.NumberFormat('fr-FR');

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export const SearchQuotaCard: React.FC = () => {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/search-quota', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(res.status === 403 ? 'Accès réservé aux administrateurs.' : 'Statut indisponible.');
      }
      const data = (await res.json()) as { status: QuotaStatus };
      setStatus(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ratioPct = status ? Math.min(100, Math.round(status.usageRatio * 100)) : 0;
  const barColor = !status
    ? 'bg-gray-300'
    : status.overLimit
      ? 'bg-red-600'
      : status.overSoftLimit
        ? 'bg-orange-500'
        : status.count >= status.alertAt
          ? 'bg-amber-400'
          : 'bg-emerald-500';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Quota de recherche Algolia</CardTitle>
            <CardDescription>
              Cycle de facturation du 9 au 8. Objectif : rester sous {status ? nf.format(status.limit) : '10 000'}{' '}
              requêtes facturables par période (0 FCFA de dépassement).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {status && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Période&nbsp;:</span>
              <Badge variant="secondary">{status.periodLabel}</Badge>
              {status.mode === 'MEILISEARCH_ONLY' ? (
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                  Meilisearch — secours quota{status.enforced ? '' : ' (observation)'}
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Algolia actif
                </Badge>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {nf.format(status.count)} / {nf.format(status.limit)} requêtes
                </span>
                <span className="text-gray-500">{ratioPct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${ratioPct}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Alerte : {nf.format(status.alertAt)}</span>
                <span>Bascule : {nf.format(status.softLimit)}</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Enforcement</dt>
              <dd>{status.enforced ? 'Actif (Phase C)' : 'Observation seule (Phase A)'}</dd>
              <dt className="text-gray-500">Dernière bascule</dt>
              <dd>{fmtDateTime(status.switchedAt)}</dd>
              <dt className="text-gray-500">Dernière alerte</dt>
              <dd>{fmtDateTime(status.lastAlertAt)}</dd>
              <dt className="text-gray-500">Compteur mis à jour</dt>
              <dd>{fmtDateTime(status.updatedAt)}</dd>
            </dl>

            {!status.enforced && (
              <p className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
                Mode observation : la bascule vers Meilisearch n&apos;est pas encore armée. Le compteur sert à
                mesurer la consommation réelle et à alerter avant dépassement. Voir{' '}
                <code>docs/location-maison/setup/ALGOLIA-QUOTA-FAILOVER.md</code>.
              </p>
            )}
          </>
        )}

        {!status && !error && isLoading && <p className="text-sm text-gray-400">Chargement…</p>}
      </CardContent>
    </Card>
  );
};
