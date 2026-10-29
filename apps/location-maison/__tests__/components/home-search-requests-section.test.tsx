import '../helpers/carousel-media';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeSearchRequestsSection from '@/components/home-page/HomeSearchRequestsSection';
import { getSearchRequests } from '@/db/search-request.db';

jest.mock('@/db/search-request.db', () => ({ getSearchRequests: jest.fn() }));
jest.mock('@/components/search-requests/SearchRequestCard', () => ({
  __esModule: true,
  default: ({ item }: { item: { description: string } }) => <article>{item.description}</article>,
}));
const getRequests = jest.mocked(getSearchRequests);
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(<QueryClientProvider client={client}><HomeSearchRequestsSection /></QueryClientProvider>);
}
beforeEach(() => jest.resetAllMocks());

it('charge quatre demandes et conserve le lien vers la liste complète', async () => {
  getRequests.mockResolvedValue({ searchRequests: [1, 2, 3, 4].map(id => ({ id: String(id), description: `Demande ${id}` })), lastDoc: null, limitPerPage: 4 } as Awaited<ReturnType<typeof getSearchRequests>>);
  mount();
  expect(await screen.findAllByRole('article', { hidden: true })).toHaveLength(4);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByRole('group', { name: 'Demandes de recherche' })).toHaveAttribute('aria-roledescription', 'carrousel');
  expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled());
  expect(screen.getAllByRole('article').at(-1)).toHaveTextContent('Demande 4');
  expect(getRequests).toHaveBeenCalledWith({ limitPerPage: 4, lastDoc: null });
  expect(screen.getByRole('link', { name: /Voir tout/ })).toHaveAttribute('href', '/demandes-recherche');
});

it('annonce le chargement', () => {
  getRequests.mockReturnValue(new Promise(() => {}));
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Chargement');
});

it('affiche une liste vide sans masquer le lien', async () => {
  getRequests.mockResolvedValue({ searchRequests: [], lastDoc: null, limitPerPage: 4 });
  mount();
  expect(await screen.findByText(/Aucune demande/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Voir tout/ })).toBeInTheDocument();
});

it('permet de réessayer après un échec réseau', async () => {
  getRequests.mockRejectedValue(new Error('offline'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible');
  getRequests.mockResolvedValue({ searchRequests: [], lastDoc: null, limitPerPage: 4 });
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByText(/Aucune demande/)).toBeInTheDocument();
});
