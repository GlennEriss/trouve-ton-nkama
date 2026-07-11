import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import SelectPropertyForReelClient from '@/components/reels/SelectPropertyForReelClient'

export default function SelectPropertyForReelPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>}>
        <SelectPropertyForReelClient />
      </Suspense>
    </div>
  )
}
