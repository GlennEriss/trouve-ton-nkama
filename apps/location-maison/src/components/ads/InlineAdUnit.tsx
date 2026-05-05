'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import AdSenseBlock from '@/components/ads/AdSenseBlock';

type InlineAdUnitProps = Readonly<{
  slot: string;
  slotKey: string;
  className?: string;
  compact?: boolean;
}>;

export default function InlineAdUnit({
  slot,
  slotKey,
  className,
  compact = false,
}: InlineAdUnitProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-3 shadow-sm', className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Publicite</p>
      <AdSenseBlock
        slot={slot}
        slotKey={slotKey}
        minHeight={compact ? 76 : 96}
      />
    </div>
  );
}
