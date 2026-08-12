'use client'

import React from 'react';
import { redirect } from 'next/navigation';
import { usePropertyStatistics } from '@/hooks/use-property-statistics';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useProperty } from '@/hooks/use-property';
import PropertyStatisticsPanel from './PropertyStatisticsPanel';
import { ArrowLeft, Loader2, BarChart3, Sparkles, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@trouve-ton-nkama/ui/button';
import { cn } from '@/lib/utils';

interface PropertyStatisticsClientProps {
  propertyId: string;
}

export default function PropertyStatisticsClient({ 
  propertyId 
}: PropertyStatisticsClientProps) {
  const { user, isLoading: authLoading } = useCurrentUser();
  const { data: property, isLoading: propertyLoading } = useProperty(propertyId);
  const { 
    data: statistics, 
    isLoading: statisticsLoading, 
    error 
  } = usePropertyStatistics(propertyId);

  // Vérifier que l'utilisateur est le propriétaire
  React.useEffect(() => {
    if (!authLoading && !propertyLoading && property) {
      if (property.createdBy !== user?.uid) {
        redirect(`/property/${propertyId}`);
      }
    }
  }, [property, user?.uid, propertyId, authLoading, propertyLoading]);

  if (authLoading || propertyLoading || statisticsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 animate-pulse" />
          <Loader2 className="h-8 w-8 animate-spin text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">
          Chargement des statistiques...
        </p>
      </div>
    );
  }

  if (!property || property.createdBy !== user?.uid) {
    return null;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link href={`/property/${propertyId}`}>
          <Button variant="ghost" size="sm" className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Retour aux détails
          </Button>
        </Link>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800/50 p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
              Une erreur est survenue
            </h3>
            <p className="text-red-600 dark:text-red-300 max-w-md">
              {error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header moderne */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link href={`/houseDetails/${propertyId}`}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white hover:bg-white/10 group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Retour à l'annonce
              </Button>
            </Link>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Analytics</span>
            </div>
          </div>

          {/* Title section */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  Statistiques privées
                </div>
              </div>
              
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Tableau de bord
              </h1>
              
              <div className="flex items-center gap-2 text-slate-400">
                <Home className="h-4 w-4" />
                <p className="text-sm md:text-base line-clamp-1">
                  {property.title}
                </p>
              </div>
            </div>

            {/* Quick stats */}
            {statistics && (
              <div className="flex gap-4">
                <QuickStat 
                  label="Vues totales" 
                  value={statistics.totalViews} 
                />
                <QuickStat 
                  label="Contacts" 
                  value={statistics.totalContacts}
                  highlight 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de statistiques */}
      {statistics && (
        <PropertyStatisticsPanel statistics={statistics} property={property} />
      )}
    </div>
  );
}

// Quick stat component for header
function QuickStat({ 
  label, 
  value,
  highlight = false 
}: { 
  label: string; 
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "px-4 py-3 rounded-2xl backdrop-blur-sm",
      highlight 
        ? "bg-emerald-500/20 border border-emerald-500/30" 
        : "bg-white/10 border border-white/10"
    )}>
      <p className={cn(
        "text-xs font-medium mb-1",
        highlight ? "text-emerald-300" : "text-slate-400"
      )}>
        {label}
      </p>
      <p className={cn(
        "text-2xl font-bold",
        highlight ? "text-emerald-400" : "text-white"
      )}>
        {new Intl.NumberFormat('fr-FR').format(value)}
      </p>
    </div>
  );
}
