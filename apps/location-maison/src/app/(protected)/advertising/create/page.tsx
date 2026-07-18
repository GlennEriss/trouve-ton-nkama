import type { Metadata } from 'next'
import AdvertisingCreateWizard from '@/components/advertising/AdvertisingCreateWizard'

export const metadata: Metadata = {
  title: 'Créer une publicité | Trouve Ton Nkama',
  description: 'Créez une campagne publicitaire Trouve Ton Nkama avec aperçus par emplacement.',
}

export default function AdvertisingCreatePage() {
  return <AdvertisingCreateWizard />
}
