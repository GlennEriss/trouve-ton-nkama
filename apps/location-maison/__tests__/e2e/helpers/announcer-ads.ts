import type { Page } from '@playwright/test'

export const fakeAd = {
  id: 'property-e2e-1',
  title: 'Appartement moderne a Akanda',
  description: 'Appartement lumineux proche de la voie principale.',
  typeProperty: 'Apartment',
  status: 'FOR_RENT',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 250000,
  area: 80,
  province: 'Estuaire',
  city: 'Akanda',
  street: 'Avorbam',
  images: [],
  createdBy: 'announcer-e2e',
  createdAt: '2026-07-18T08:00:00.000Z',
  updatedAt: '2026-07-18T09:00:00.000Z',
  currentPromotion: null,
}

export const fakeArchivedAd = {
  ...fakeAd,
  id: 'property-e2e-archived',
  title: 'Studio archive a Nzeng-Ayong',
  typeProperty: 'Studio',
  state: 'ARCHIVED',
  price: 120000,
  area: 35,
  city: 'Libreville',
  street: 'Nzeng-Ayong',
}

export function createFakeAdsResponse(items = [fakeAd]) {
  const active = items.filter((item) => item.state === 'IN_PROGRESS').length
  const archived = items.filter((item) => item.state === 'ARCHIVED').length
  const forRent = items.filter((item) => item.status === 'FOR_RENT').length
  const forSale = items.filter((item) => item.status === 'FOR_SALE').length

  return {
    success: true,
    items,
    pagination: {
      total: items.length,
      limit: 12,
      cursor: '0',
      nextCursor: null,
      hasMore: false,
    },
    summary: {
      global: {
        total: items.length,
        active,
        archived,
        promoted: 0,
        forRent,
        forSale,
      },
      filtered: {
        total: items.length,
        active,
        archived,
        promoted: 0,
        forRent,
        forSale,
      },
    },
    appliedFilters: {
      q: '',
      type: '',
      status: '',
      state: '',
      promoted: '',
      priceMin: null,
      priceMax: null,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  }
}

export async function mockAnnouncerAds(page: Page, body = createFakeAdsResponse()) {
  await page.route('**/api/announcer/ads**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}
