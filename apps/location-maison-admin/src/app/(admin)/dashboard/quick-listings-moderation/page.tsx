'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@trouve-ton-nkama/ui/button';
import { Card, CardContent } from '@trouve-ton-nkama/ui/card';
import { PageHeader } from '@/components/ui-kit/page-header';
type Item = { id: string; description: string; province: string; city: string; neighborhood: string; contactPhone: string };
export default function QuickListingsModeration() {
  const [cursor, setCursor] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const client = useQueryClient();
  const query = useQuery<{ items: Item[]; nextCursor: string | null }>({ queryKey: ['quick-listings-moderation', cursor], queryFn: async () => {
    const response = await fetch(`/api/admin/v1/quick-listings?cursor=${encodeURIComponent(cursor)}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Chargement impossible.');
    return body.data;
  } });
  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    const reason = decision === 'REJECTED' ? window.prompt('Motif du rejet (3 caractères minimum)')?.trim() : undefined;
    if (decision === 'REJECTED' && (!reason || reason.length < 3)) return;
    setBusy(id); setError('');
    try {
      const response = await fetch('/api/admin/v1/quick-listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision, reason }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Décision non appliquée.');
      await client.invalidateQueries({ queryKey: ['quick-listings-moderation'] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau.'); } finally { setBusy(null); }
  }
  return <div className="space-y-6"><PageHeader title="Annonces rapides à modérer" description="Offres sans photo, payées 200 FCFA. Aucune publication avant approbation." />
    {(error || query.error) && <p role="alert">{error || query.error?.message}</p>}
    {query.isLoading && <p role="status">Chargement…</p>}
    {query.data?.items.length === 0 && <p>Aucune annonce à modérer sur cette page.</p>}
    {query.data?.items.map(item => <Card key={item.id}><CardContent className="space-y-3 p-5"><p className="whitespace-pre-wrap break-words">{item.description}</p><p>{item.province} · {item.city} · {item.neighborhood}</p><p>{item.contactPhone}</p><div className="flex flex-wrap gap-3"><Button disabled={!!busy} onClick={() => void decide(item.id, 'APPROVED')}>Approuver</Button><Button variant="outline" disabled={!!busy} onClick={() => void decide(item.id, 'REJECTED')}>Rejeter</Button></div></CardContent></Card>)}
    <div className="flex gap-3">{cursor && <Button variant="outline" onClick={() => setCursor('')}>Début de la file</Button>}{query.data?.nextCursor && <Button onClick={() => setCursor(query.data!.nextCursor!)}>Suivant</Button>}<Button variant="outline" onClick={() => void query.refetch()}>Actualiser</Button></div>
  </div>;
}
