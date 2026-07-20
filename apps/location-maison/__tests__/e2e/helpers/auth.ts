import type { BrowserContext, Page } from '@playwright/test'
import { encode } from 'next-auth/jwt'

export const AUTH_COOKIE_NAME = 'authjs.session-token'
export const E2E_BASE_URL = 'http://localhost:3001'

export const E2E_ANNOUNCER = {
  uid: 'announcer-e2e',
  firstname: 'Glenn',
  lastname: 'Eriss',
  email: 'glenn.e2e@example.com',
  roles: ['Announcer'],
  phoneNumbers: ['+24166545430'],
  phoneNumberVerified: true,
  birthDate: '1990-01-01',
  credits: 169,
  favoris: [],
  providers: ['CREDENTIALS'],
  notificationParameter: {
    isNew: false,
    isAccountActivity: false,
    isNewAnnouncement: false,
    isFavoris: false,
    isPersonalizedSuggestions: false,
    isSystemUpdated: false,
  },
  metadata: { needsProfileCompletion: false },
}

export type E2EAnnouncer = typeof E2E_ANNOUNCER

export async function signInAsAnnouncer(
  context: BrowserContext,
  baseURL = E2E_BASE_URL,
  user: E2EAnnouncer = E2E_ANNOUNCER,
) {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET is required to create an E2E session')
  }

  const value = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    salt: AUTH_COOKIE_NAME,
    token: {
      user,
    },
  })

  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value,
      url: baseURL,
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    },
  ])
}

export async function mockCommonAppNoise(
  page: Page,
  options: { mockFirebaseToken?: boolean } = {},
) {
  await page.addInitScript(() => {
    const styleId = 'e2e-hide-next-devtools'
    const installStyle = () => {
      if (document.getElementById(styleId)) return
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        nextjs-portal,
        [data-nextjs-dev-overlay],
        [aria-label="Open Next.js Dev Tools"] {
          display: none !important;
          pointer-events: none !important;
        }
      `
      document.head.appendChild(style)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installStyle, { once: true })
    } else {
      installStyle()
    }
  })

  await page.route('**/api/analytics/**', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/api/meta/capi', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  if (options.mockFirebaseToken !== false) {
    await page.route('**/api/generate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'e2e-firebase-custom-token-disabled',
        }),
      })
    })
  }

  await page.route('https://www.google-analytics.com/**', async (route) => route.abort())
  await page.route('https://www.googletagmanager.com/**', async (route) => route.abort())
  await page.route('https://googleads.g.doubleclick.net/**', async (route) => route.abort())
}
