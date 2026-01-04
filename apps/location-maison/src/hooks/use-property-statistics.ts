'use client'

import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from './use-current-user';
import { auth } from '@/firebase/auth';
import { PropertyStatistics } from '@/db/property-statistics.db';

async function fetchPropertyStatistics(propertyId: string): Promise<PropertyStatistics> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  const token = await user.getIdToken();
  
  const response = await fetch(`/api/property/${propertyId}/statistics`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      throw new Error('Accès non autorisé');
    }
    
    throw new Error(errorData.error ?? 'Erreur lors de la récupération des statistiques');
  }

  return response.json();
}

export function usePropertyStatistics(propertyId: string | undefined) {
  const { user, isLoading: authLoading, isFirebaseConnected, error: authError } = useCurrentUser();

  return useQuery({
    queryKey: ['property-statistics', propertyId, user?.uid],
    queryFn: () => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      return fetchPropertyStatistics(propertyId);
    },
    enabled: !!propertyId && !!user?.uid && isFirebaseConnected && !authLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur d'authentification ou d'autorisation
      if (
        error.message?.includes('authentification') || 
        error.message?.includes('autorisé') ||
        error.message?.includes('token')
      ) {
        return false;
      }
      // Ne pas retry si l'auth est en erreur
      if (authError) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

