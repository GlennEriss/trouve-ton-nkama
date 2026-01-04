'use client'

import React from 'react';
import Link from 'next/link';
import { Eye, Phone, Share2, ArrowRight } from 'lucide-react';
import { usePropertyStatistics } from '@/hooks/use-property-statistics';
import { Property } from '@/models/annonce';
import { Button } from '@/components/ui/button';

interface PropertyStatisticsSummaryProps {
  propertyId: string;
  property: Property;
}

export default function PropertyStatisticsSummary({ 
  propertyId, 
  property 
}: PropertyStatisticsSummaryProps) {
  const { data: statistics, isLoading } = usePropertyStatistics(propertyId);

  if (isLoading || !statistics) {
    return (
      <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold">Statistiques</h1>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Formater les nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const totalInteractions = 
    statistics.whatsappContacts + 
    statistics.phoneContacts + 
    statistics.whatsappShares + 
    statistics.facebookShares;

  return (
    <section className="flex flex-col gap-3 rounded-lg p-5 shadow dark:shadow-gray-800 dark:bg-gray-800 dark:text-white">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-bold">Statistiques</h1>
        <Link href={`/property/${propertyId}/statistics`}>
          <Button variant="outline" size="sm" className="text-xs">
            Voir tout
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Vues */}
        <StatCardMini
          icon={<Eye className="h-4 w-4" />}
          label="Vues"
          value={formatNumber(statistics.totalViews)}
          subtitle={`${formatNumber(statistics.uniqueViews)} uniques`}
        />

        {/* Contacts */}
        <StatCardMini
          icon={<Phone className="h-4 w-4" />}
          label="Contacts"
          value={formatNumber(statistics.totalContacts)}
          subtitle={`${statistics.contactRate.toFixed(1)}% conversion`}
        />

        {/* Interactions */}
        <StatCardMini
          icon={<Share2 className="h-4 w-4" />}
          label="Interactions"
          value={formatNumber(totalInteractions)}
          subtitle={`${formatNumber(statistics.whatsappShares + statistics.facebookShares)} partages`}
        />
      </div>
    </section>
  );
}

// Composant pour les mini-cartes de statistiques
function StatCardMini({ 
  icon, 
  label, 
  value, 
  subtitle 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="text-gray-600 dark:text-gray-400 mb-2">
        {icon}
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
        {label}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">
          {subtitle}
        </div>
      )}
    </div>
  );
}

