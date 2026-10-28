import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuickListingsFeed from '@/components/quick-listings/QuickListingsFeed';
const mockFetch = jest.fn();
const item = { id: 'first', description: 'Maison de test à louer', city: 'Libreville', province: 'Estuaire', contactPhone: '+24160000000' };
function mount(preview = false) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}><QuickListingsFeed preview={preview} /></QueryClientProvider>);
}
beforeEach(() => { mockFetch.mockReset(); global.fetch = mockFetch; });
it('borne l’aperçu à quatre et propose Voir tout', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [item], nextCursor: 'next' }) });
  mount(true);
  expect(await screen.findByText(item.description)).toBeInTheDocument();
  expect(mockFetch.mock.calls[0][0]).toBe('/api/quick-listings?limit=4');
  expect(screen.getByRole('link', { name: /Voir tout/ })).toHaveAttribute('href', '/search?category=Rapides');
  expect(screen.queryByRole('button', { name: 'Afficher plus' })).toBeNull();
});
it('pagine par curseur et conserve les cartes', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [item], nextCursor: 'cursor' }) });
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ ...item, id: 'second', description: 'Deuxième offre de test' }], nextCursor: null }) });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Afficher plus' }));
  expect(await screen.findByText('Deuxième offre de test')).toBeInTheDocument();
  expect(screen.getByText(item.description)).toBeInTheDocument();
  expect(mockFetch.mock.calls[1][0]).toBe('/api/quick-listings?limit=20&cursor=cursor');
});
it('distingue chargement et vide', async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [], nextCursor: null }) });
  mount();
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByText(/Aucune annonce rapide/)).toBeInTheDocument();
});
it('permet la reprise après une panne', async () => {
  mockFetch.mockResolvedValue({ ok: false });
  mount();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [item], nextCursor: null }) });
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByText(item.description)).toBeInTheDocument();
});
