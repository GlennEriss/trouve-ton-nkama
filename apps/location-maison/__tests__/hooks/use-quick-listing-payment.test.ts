import { act, renderHook, waitFor } from '@testing-library/react';
import { useQuickListingPayment } from '@/hooks/use-quick-listing-payment';
const draft = { description: 'Studio à louer 100 000 FCFA', address: { province: 'Estuaire', city: 'Libreville', district: 'Nzeng-Ayong' }, contactPhone: '+24166123456' };
beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
it('double clic : une seule initiation, confirmation distincte de publication', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ status: 202, json: async () => ({}) }).mockResolvedValue({ ok: true, json: async () => ({ status: 'confirmed' }) });
  const { result } = renderHook(() => useQuickListingPayment());
  await act(async () => { await Promise.all([result.current.start(draft, '074000000', 'AM'), result.current.start(draft, '074000000', 'AM')]); });
  await waitFor(() => expect(result.current.phase).toBe('confirmed'));
  expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url.endsWith('/initiate'))).toHaveLength(1);
});
it('reprend après rechargement sans initier un autre débit', async () => {
  localStorage.setItem('nkama.quick-payment.operation.v1', 'a'.repeat(64));
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ status: 'confirmed' }) });
  const { result } = renderHook(() => useQuickListingPayment());
  await waitFor(() => expect(result.current.phase).toBe('confirmed'));
  expect(global.fetch).toHaveBeenCalledWith('/api/quick-listings/payments/status', expect.objectContaining({ headers: { Authorization: `Bearer ${'a'.repeat(64)}` } }));
});
it('configuration désactivée : message explicite et aucune opération en attente', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ status: 503, json: async () => ({ message: 'Indisponible' }) });
  const { result } = renderHook(() => useQuickListingPayment());
  await act(async () => { await result.current.start(draft, '074000000', 'AM'); });
  expect(result.current.phase).toBe('idle'); expect(result.current.error).toBe('Indisponible');
  expect(localStorage.length).toBe(0);
});
