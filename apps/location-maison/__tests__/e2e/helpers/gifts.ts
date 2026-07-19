import type { Page } from '@playwright/test'

export const fakeGiftsSummary = {
  balance: {
    totalRecuXaf: 42_500,
    totalRetireXaf: 10_000,
    disponibleXaf: 32_500,
    hasPendingWithdrawal: false,
  },
  gifts: [
    {
      id: 'gift-e2e-1',
      netAmountXaf: 9_500,
      message: 'Belle visite, continue comme ça !',
      reelId: 'reel-e2e-1',
      donorPhoneMasked: '077****42',
      createdAt: '2026-07-18T08:00:00.000Z',
    },
  ],
  withdrawals: [
    {
      id: 'withdrawal-e2e-1',
      montantXaf: 10_000,
      feeXaf: 500,
      netPayoutXaf: 9_500,
      numero: '077123456',
      reseau: 'AM',
      statut: 'TRAITE',
      motifRefus: null,
      dateCreation: '2026-07-10T08:00:00.000Z',
    },
  ],
}

export async function mockGiftsApi(page: Page) {
  await page.route('**/api/gifts/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fakeGiftsSummary),
    })
  })

  await page.route('**/api/gifts/withdrawals', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, id: 'withdrawal-created-e2e' }),
    })
  })
}
