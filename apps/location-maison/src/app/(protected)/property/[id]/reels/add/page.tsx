import { notFound } from 'next/navigation'
import React from 'react'
import CreateReelClient from '@/components/reels/CreateReelClient'

export default async function AddReelPage({
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
      <CreateReelClient propertyId={id} />
    </div>
  );
}
