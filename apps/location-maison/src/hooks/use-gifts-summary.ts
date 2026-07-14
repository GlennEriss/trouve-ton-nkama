'use client'

/**
 * Résumé cadeaux de l'annonceur connecté (solde dérivé + historiques),
 * même pattern d'appel authentifié Bearer que use-property-statistics.
 */

import { useQuery } from '@tanstack/react-query';
import { auth } from '@/firebase/auth';
import { useCurrentUser } from './use-current-user';
import type { GiftNetwork, GiftWithdrawalStatus } from '@/models/gift';
import type { GiftBalance } from '@/lib/gifts/balance';

export interface GiftsSummary {
  balance: GiftBalance;
  gifts: Array<{
    id: string;
    netAmountXaf: number;
    message: string | null;
    reelId: string | null;
    donorPhoneMasked: string;
    createdAt: string | null;
  }>;
  withdrawals: Array<{
    id: string;
    montantXaf: number;
    feeXaf: number;
    netPayoutXaf: number;
    numero: string;
    reseau: GiftNetwork;
    statut: GiftWithdrawalStatus;
    motifRefus: string | null;
    dateCreation: string | null;
  }>;
}

async function fetchGiftsSummary(): Promise<GiftsSummary> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/gifts/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message ?? 'Erreur lors du chargement des cadeaux');
  }

  return response.json();
}

export function useGiftsSummary() {
  const { user, isLoading: authLoading, isFirebaseConnected } = useCurrentUser();

  return useQuery({
    queryKey: ['gifts-summary', user?.uid],
    queryFn: fetchGiftsSummary,
    enabled: !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60,
  });
}
