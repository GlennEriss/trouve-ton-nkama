import React from 'react'
import { cn } from '@/lib/utils';

export default function Logo({className}: {className?: string}) {
  return (
    <div className={cn('text-4xl text-black font-bold', className)}>Home-Rent</div>
  )
}
