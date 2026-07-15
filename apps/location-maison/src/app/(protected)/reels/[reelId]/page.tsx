import React from 'react'
import type { Metadata } from 'next'
import SingleReelClient from '@/components/reels/SingleReelClient'

export const metadata: Metadata = {
  title: 'Réel — Trouve Ton Nkama',
}

export default async function SingleReelPage({
  params,
}: {
  params: Promise<{ reelId: string }>
}) {
  const { reelId } = await params
  return <SingleReelClient reelId={reelId} />
}
