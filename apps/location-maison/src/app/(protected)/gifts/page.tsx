import type { Metadata } from 'next'
import GiftsDashboard from '@/components/gifts/GiftsDashboard'

export const metadata: Metadata = {
  title: 'Mes cadeaux — Trouve Ton Nkama',
  description: 'Consultez les cadeaux reçus sur vos réels et retirez votre solde Mobile Money.',
}

export default function GiftsPage() {
  return <GiftsDashboard />
}
