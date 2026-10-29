'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QuickListingDraft } from '@/features/quick-listings/draft';
const STORAGE_KEY = 'nkama.quick-payment.operation.v1';
type Phase = 'idle' | 'initiating' | 'pending' | 'confirmed' | 'failed' | 'unknown';
async function paymentFetch(url: string, init: RequestInit, timeout: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export function useQuickListingPayment() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [reference, setReference] = useState('');
  const secretRef = useRef<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resume = useCallback(async () => {
    const secret = secretRef.current;
    if (!secret || busy.current) return;
    if (timer.current) clearTimeout(timer.current);
    const current = ++generation.current;
    setPhase('pending'); setError('');
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await paymentFetch('/api/quick-listings/payments/status', {
          headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store',
        }, 10000);
        const data = await response.json();
        if (current !== generation.current) return;
        if (response.ok && typeof data.transactionId === 'string') setReference(data.transactionId);
        if (response.ok && (data.status === 'confirmed' || data.status === 'failed')) {
          setPhase(data.status); return;
        }
      } catch { /* Réseau indisponible ≠ échec financier. */ }
      if (current !== generation.current) return;
      if (++attempts >= 60) {
        setPhase('unknown'); setError('Confirmation non reçue. Ne payez pas à nouveau : reprenez le suivi ou contactez glenneriss@gmail.com.'); return;
      }
      timer.current = setTimeout(poll, 3000);
    };
    await poll();
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && /^[a-f0-9]{64}$/.test(saved)) { secretRef.current = saved; void resume(); }
    } catch { setError('Le stockage local est indisponible. Le paiement nécessite de conserver son suivi.'); }
    setReady(true);
    return () => { ++generation.current; if (timer.current) clearTimeout(timer.current); };
  }, [resume]);
  const start = async (draft: QuickListingDraft, payerPhone: string, network: 'AM' | 'MM') => {
    if (!ready || busy.current || secretRef.current) return;
    const lifecycle = generation.current;
    busy.current = true; setError('');
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(STORAGE_KEY, secret); }
    catch { busy.current = false; setError('Impossible de conserver le suivi. Aucun paiement lancé.'); return; }
    secretRef.current = secret; setPhase('initiating');
    try {
      const response = await paymentFetch('/api/quick-listings/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, payerPhone, network, operationSecret: secret }) }, 30000);
      const data = await response.json();
      if ([400, 403, 429, 503].includes(response.status)) {
        localStorage.removeItem(STORAGE_KEY); secretRef.current = null;
        setPhase('idle'); setError(data.message || 'Paiement non lancé.'); return;
      }
    } catch { /* Garder la référence même si la réponse d'initiation est perdue. */ }
    finally { busy.current = false; }
    if (lifecycle === generation.current) void resume();
  };
  const newListing = () => {
    if (phase !== 'confirmed') return;
    localStorage.removeItem(STORAGE_KEY); secretRef.current = null; setPhase('idle'); setError(''); setReference('');
  };
  return { phase, error, ready, reference, start, resume, newListing, hasOperation: phase !== 'idle' };
}
