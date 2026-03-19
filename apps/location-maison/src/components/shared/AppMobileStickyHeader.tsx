'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

interface AppMobileStickyHeaderProps {
  title: React.ReactNode
  backHref?: string
  rightSlot?: React.ReactNode
  className?: string
  titleClassName?: string
  mobileOnly?: boolean
  staticOnDesktop?: boolean
}

export default function AppMobileStickyHeader({
  title,
  backHref,
  rightSlot,
  className,
  titleClassName,
  mobileOnly = true,
  staticOnDesktop = true
}: AppMobileStickyHeaderProps) {
  const titleNode =
    typeof title === 'string' ? (
      <h1 className={cn('truncate text-xl font-bold text-gray-900 dark:text-white', titleClassName)}>{title}</h1>
    ) : (
      title
    )

  return (
    <div
      className={cn(
        'sticky top-0 z-50 flex items-center gap-3 border-b px-5 py-3 shadow bg-white dark:bg-gray-900 dark:border-gray-700',
        staticOnDesktop && 'md:static',
        mobileOnly && 'md:hidden',
        className
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">{titleNode}</div>
      {rightSlot}
    </div>
  )
}
