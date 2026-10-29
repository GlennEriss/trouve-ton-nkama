'use client';
import { useState } from 'react';
import { Button } from '@trouve-ton-nkama/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@trouve-ton-nkama/ui/dialog';
import PaymentStatusModal from '@/components/my-balance/PaymentStatusModal';
import { PAYMENT_METHODS, isPhoneValidForNetwork } from '@/constantes/payment-methods';
import type { QuickListingDraft } from '@/features/quick-listings/draft';
import type { useQuickListingPayment } from '@/hooks/use-quick-listing-payment';

export default function QuickListingPayment({ draft, payment }: { draft: QuickListingDraft | null; payment: ReturnType<typeof useQuickListingPayment> }) {
  const [open, setOpen] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'AM' | 'MM'>('AM');
  const message = payment.phase === 'confirmed' ? 'Paiement de 200 FCFA confirmé. Votre annonce est soumise à la modération ; elle ne sera visible qu’après approbation.'
    : payment.phase === 'failed' ? 'Le prestataire a signalé un échec. Si vous avez été débité, contactez glenneriss@gmail.com avant tout nouveau paiement.'
    : 'Paiement en cours de vérification. Confirmez sur votre téléphone si une demande apparaît. Fermer cette fenêtre n’annule pas le paiement. Ne payez pas à nouveau.';
  return <section className="space-y-3" aria-label="Paiement de l’annonce">
    {payment.error && <p role="alert">{payment.error}</p>}
    {payment.hasOperation ? <>
      <p role="status">{message}</p>
      {payment.reference && <p className="break-all text-sm">Référence à conserver : {payment.reference}</p>}
      <Button type="button" disabled={payment.phase === 'initiating'} onClick={() => { setShowStatus(true); if (!['confirmed', 'failed'].includes(payment.phase)) void payment.resume(); }}>Voir le suivi du paiement</Button>
      {payment.phase === 'confirmed' && <Button type="button" variant="outline" onClick={() => { payment.newListing(); window.location.reload(); }}>Créer une autre annonce</Button>}
    </> : <Button type="button" disabled={!draft || !payment.ready} onClick={() => setOpen(true)}>Payer 200 FCFA et soumettre</Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900"><DialogHeader><DialogTitle>Paiement de 200 FCFA</DialogTitle><DialogDescription>Après confirmation du paiement, votre annonce sera examinée par l’administration.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap gap-3">{PAYMENT_METHODS.map(method => <Button key={method.network} type="button" variant={network === method.network ? 'default' : 'outline'} aria-pressed={network === method.network} onClick={() => setNetwork(method.network)}>{method.name}</Button>)}</div>
        <label htmlFor="quick-payer">Numéro Mobile Money du payeur</label>
        <input id="quick-payer" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="074 XX XX XX" className="min-h-11 rounded-lg border bg-transparent p-3" />
        <p className="text-sm">Ce numéro reste privé et peut être différent du contact public de l’annonce.</p>
        <Button type="button" disabled={!draft || !isPhoneValidForNetwork(phone, network) || payment.hasOperation} onClick={() => { if (draft) { setOpen(false); setShowStatus(true); void payment.start(draft, phone, network); } }}>Confirmer le paiement de 200 FCFA</Button>
      </DialogContent>
    </Dialog>
    <div className="relative z-[10030]"><PaymentStatusModal isOpen={showStatus && payment.hasOperation} status={payment.phase === 'confirmed' ? 'success' : payment.phase === 'failed' ? 'failed' : 'pending'} message={message} actionLabel="Fermer" onAction={() => setShowStatus(false)} onClose={() => setShowStatus(false)} /></div>
  </section>;
}
