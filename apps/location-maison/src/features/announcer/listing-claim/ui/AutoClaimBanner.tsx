'use client';

/**
 * Welcomes an announcer whose listings were just auto-attributed (Lot 4b —
 * see phone-auth.service.ts) via their verified phone number. Reads the
 * one-shot `metadata.pendingClaimNotice` from the session and clears it
 * server-side on dismiss so it never reappears.
 */

import { useCallback, useState } from 'react';
import { PartyPopper, X } from 'lucide-react';

import { useCurrentUser } from '@/hooks/use-current-user';
import { createLogger } from '@/lib/logger';

const logger = createLogger('announcer.listing-claim.auto-claim-banner');

type PendingClaimNotice = {
  count: number;
  claimedAt: string;
};

export function AutoClaimBanner() {
  const { user, refreshSession } = useCurrentUser();
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const notice = (user?.metadata?.pendingClaimNotice as PendingClaimNotice | undefined) ?? undefined;

  const handleDismiss = useCallback(async () => {
    setIsDismissing(true);
    try {
      await fetch('/api/announcer/claim-notice/dismiss', { method: 'POST' });
      setDismissed(true);
      await refreshSession();
    } catch (error) {
      logger.warn('Failed to dismiss the auto-claim notice', { error });
      // Hide it locally regardless — worst case it reappears next session.
      setDismissed(true);
    } finally {
      setIsDismissing(false);
    }
  }, [refreshSession]);

  if (!notice || notice.count <= 0 || dismissed) {
    return null;
  }

  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
      <div className="flex items-center gap-3">
        <PartyPopper className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
        <p className="text-sm">
          <strong>
            {notice.count} annonce{notice.count > 1 ? 's' : ''}
          </strong>{' '}
          {notice.count > 1 ? 'ont été automatiquement rattachées' : 'a été automatiquement rattachée'} à votre
          compte — elles étaient publiées sous votre numéro de téléphone. Vous pouvez maintenant les gérer.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleDismiss()}
        disabled={isDismissing}
        aria-label="Fermer"
        className="shrink-0 rounded-full p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
