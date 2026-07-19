import type { Page } from '@playwright/test'

export const fakeCreditPacks = [
  { id: 'starter', name: 'Starter', credits: 5, price: 2_000, order: 1, isActive: true },
  { id: 'standard', name: 'Standard', credits: 10, price: 3_500, savings: 12.5, order: 2, isActive: true },
  { id: 'advanced', name: 'Avancé', credits: 25, price: 7_500, savings: 25, order: 3, isActive: true },
  { id: 'premium', name: 'Premium', credits: 50, price: 12_500, savings: 37.5, order: 4, isActive: true },
]

export async function mockBalanceApi(page: Page) {
  await page.route('**/api/credits/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        credits: 169,
        message: 'Vous avez 169 crédits',
      }),
    })
  })

  await page.route('**/api/credits/packs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        packs: fakeCreditPacks,
        source: 'firestore',
        message: 'Packs chargés depuis la configuration admin',
      }),
    })
  })

  await page.route('**/api/credits/history**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        transactions: [
          {
            id: 'credit-e2e-1',
            userId: 'announcer-e2e',
            type: 'purchase',
            credits: 70,
            amount: 10_000,
            status: 'success',
            description: 'Recharge Pack Boost',
            createdAt: '2026-07-18T10:00:00.000Z',
            updatedAt: '2026-07-18T10:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
        total: 1,
      }),
    })
  })
}
