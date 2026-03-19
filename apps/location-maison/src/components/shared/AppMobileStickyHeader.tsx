'use client'

import { cn } from '@/lib/utils'
import { getPageHeaderStrategy, PageHeaderStrategyName } from '@/lib/ui/page-header-strategies'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

interface AppMobileStickyHeaderProps {
  title: React.ReactNode
  backHref?: string
  rightSlot?: React.ReactNode
  className?: string
  titleClassName?: string
  mobileOnly?: boolean
  staticOnDesktop?: boolean
  strategy?: PageHeaderStrategyName
}

export default function AppMobileStickyHeader({
  title,
  backHref,
  rightSlot,
  className,
  titleClassName,
  mobileOnly = true,
  staticOnDesktop = true,
  strategy = 'mobile-compact'
}: AppMobileStickyHeaderProps) {
  const pathname = usePathname()
  const headerStrategy = getPageHeaderStrategy(strategy)

  const titleNode =
    typeof title === 'string' ? (
      <h1 className={cn('truncate text-xl font-bold text-gray-900 dark:text-white', titleClassName)}>{title}</h1>
    ) : (
      title
    )

  return (
    <div
      className={headerStrategy.getContainerClasses({
        className,
        mobileOnly,
        staticOnDesktop
      })}
    >
      {backHref && headerStrategy.showBackButton(backHref, pathname) ? (
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
