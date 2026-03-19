import { cn } from '@/lib/utils'

export type PageHeaderStrategyName = 'mobile-compact' | 'desktop' | 'legacy'

interface PageHeaderClassContext {
  className?: string
  mobileOnly: boolean
  staticOnDesktop: boolean
}

export interface PageHeaderStrategy {
  getContainerClasses(context: PageHeaderClassContext): string
  getStickyTopOffset(): string
  showBackButton(backHref?: string, pathname?: string): boolean
}

class MobileCompactHeaderStrategy implements PageHeaderStrategy {
  getContainerClasses({ className, mobileOnly, staticOnDesktop }: PageHeaderClassContext): string {
    return cn(
      'sticky z-50 flex items-center gap-3 border-b px-5 py-3 shadow bg-white dark:bg-gray-900 dark:border-gray-700',
      this.getStickyTopOffset(),
      staticOnDesktop && 'md:static',
      mobileOnly && 'md:hidden',
      className
    )
  }

  getStickyTopOffset(): string {
    return 'top-0'
  }

  showBackButton(backHref?: string): boolean {
    return Boolean(backHref)
  }
}

class DesktopHeaderStrategy implements PageHeaderStrategy {
  getContainerClasses({ className, mobileOnly, staticOnDesktop }: PageHeaderClassContext): string {
    return cn(
      'sticky z-50 flex items-center gap-3 border-b px-5 py-3 shadow bg-white dark:bg-gray-900 dark:border-gray-700',
      this.getStickyTopOffset(),
      staticOnDesktop && 'md:static',
      mobileOnly && 'md:hidden',
      className
    )
  }

  getStickyTopOffset(): string {
    return 'top-0'
  }

  showBackButton(backHref?: string): boolean {
    return Boolean(backHref)
  }
}

class LegacyHeaderStrategy implements PageHeaderStrategy {
  getContainerClasses({ className, mobileOnly, staticOnDesktop }: PageHeaderClassContext): string {
    return cn(
      'sticky top-0 z-50 flex items-center gap-3 border-b px-5 py-3 shadow bg-white dark:bg-gray-900 dark:border-gray-700',
      staticOnDesktop && 'md:static',
      mobileOnly && 'md:hidden',
      className
    )
  }

  getStickyTopOffset(): string {
    return 'top-0'
  }

  showBackButton(backHref?: string): boolean {
    return Boolean(backHref)
  }
}

const strategies: Record<PageHeaderStrategyName, PageHeaderStrategy> = {
  'mobile-compact': new MobileCompactHeaderStrategy(),
  desktop: new DesktopHeaderStrategy(),
  legacy: new LegacyHeaderStrategy()
}

export function getPageHeaderStrategy(strategy: PageHeaderStrategyName): PageHeaderStrategy {
  return strategies[strategy] ?? strategies.legacy
}
