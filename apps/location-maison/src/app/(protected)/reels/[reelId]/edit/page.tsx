import React from 'react'
import type { Metadata } from 'next'
import EditReelClient from '@/components/reels/EditReelClient'

export const metadata: Metadata = {
  title: 'Modifier un réel — Trouve Ton Nkama',
}

export default async function EditReelPage({
  params,
}: {
  params: Promise<{ reelId: string }>
}) {
  const { reelId } = await params

  return (
    <div className="container mx-auto px-4 py-8">
      <EditReelClient reelId={reelId} />
    </div>
  )
}
