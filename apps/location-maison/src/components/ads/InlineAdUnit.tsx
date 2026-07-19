'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import AdSenseBlock from '@/components/ads/AdSenseBlock';

type InlineAdUnitProps = Readonly<{
  slot: string;
  slotKey: string;
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  surface?: 'none' | 'card';
}>;

export default function InlineAdUnit({
  slot,
  slotKey,
  className,
  compact = false,
  showLabel = false,
  surface = 'none',
}: InlineAdUnitProps) {
  const containerClassName =
    surface === 'card'
      ? 'ads-inline-shell rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900'
      : 'ads-inline-shell';

  return (
    <div className={cn(containerClassName, className)}>
      {showLabel ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Publicite</p>
      ) : null}
      <AdSenseBlock
        slot={slot}
        slotKey={slotKey}
        minHeight={compact ? 48 : 60}
      />
    </div>
  );
}
