import PropertyStatisticsClient from '@/components/property/PropertyStatisticsClient'
import { notFound } from 'next/navigation'
import React from 'react'

export default async function PropertyStatisticsPage({ 
  params 
}: { 
  params: Promise<{ id?: string }> 
}) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PropertyStatisticsClient propertyId={id} />
    </div>
  );
}

