'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'

const ADSENSE_CLIENT = 'ca-pub-2799688336707362'
const ADSENSE_SLOT = '7503013398'

const logger = createLogger('components.ads.global-banner')

export default function GlobalAdSenseBanner() {
    const pathname = usePathname()
    const adRef = React.useRef<HTMLModElement | null>(null)

    React.useEffect(() => {
        let retries = 0
        let cancelled = false

        const tryInitialize = () => {
            if (typeof window === 'undefined' || cancelled) {
                return true
            }

            const adElement = adRef.current
            if (!adElement) {
                return false
            }

            if (adElement.getAttribute('data-ad-status') === 'done') {
                return true
            }

            const adsWindow = window as Window & { adsbygoogle?: Array<Record<string, unknown>> }
            if (!adsWindow.adsbygoogle) {
                return false
            }

            try {
                adsWindow.adsbygoogle.push({})
                return true
            } catch (error) {
                logger.warn('AdSense push failed', {
                    error,
                    pathname,
                    adStatus: adElement.getAttribute('data-ad-status'),
                })
                return false
            }
        }

        if (tryInitialize()) {
            return () => {
                cancelled = true
            }
        }

        const intervalId = window.setInterval(() => {
            if (tryInitialize()) {
                window.clearInterval(intervalId)
                return
            }

            retries += 1
            if (retries >= 20) {
                window.clearInterval(intervalId)
                logger.warn('AdSense global slot init timeout', { pathname })
            }
        }, 350)

        return () => {
            cancelled = true
            window.clearInterval(intervalId)
        }
    }, [pathname])

    return (
        <div
            className={cn(
                "w-full px-2 py-2 sm:px-3",
                "border-t border-[#1d3d3a]/10 bg-white/95 backdrop-blur dark:border-gray-700/50 dark:bg-gray-900/80"
            )}
        >
            <div className="mx-auto w-full max-w-[980px] rounded-xl border border-[#1d3d3a]/20 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <ins
                    key={pathname}
                    ref={adRef}
                    className="adsbygoogle"
                    style={{ display: 'block', minHeight: '50px' }}
                    data-ad-client={ADSENSE_CLIENT}
                    data-ad-slot={ADSENSE_SLOT}
                    data-ad-format="horizontal"
                    data-full-width-responsive="true"
                />
            </div>
        </div>
    )
}
