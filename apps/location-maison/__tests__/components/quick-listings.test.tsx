import React from 'react';
import { render, screen } from '@testing-library/react';
import QuickListingCard from '@/components/quick-listings/QuickListingCard';
import QuickListingDetail from '@/components/quick-listings/QuickListingDetail';
import { toPublicQuickListing } from '@/features/quick-listings/public-listing';

const raw = { description: 'Maison à louer\nContactez-moi pour visiter.', province: 'Estuaire', city: 'Libreville', neighborhood: 'Nzeng-Ayong', contactPhone: '074124961', paymentStatus: 'confirmed', moderationStatus: 'APPROVED', state: 'IN_PROGRESS', payerPhone: 'SECRET', providerPaymentToken: 'SECRET', ownerUid: 'private' };
const item = toPublicQuickListing('test-quick', raw)!;

describe('public quick listings', () => {
  it('ne projette que les champs publics et normalise le contact', () => {
    expect(item.contactPhone).toBe('+24174124961');
    expect(item).not.toHaveProperty('payerPhone');
    expect(item).not.toHaveProperty('providerPaymentToken');
    expect(item).not.toHaveProperty('ownerUid');
  });
  it.each([
    { paymentStatus: 'pending_confirmation' }, { paymentStatus: 'failed' },
    { moderationStatus: 'PENDING' }, { moderationStatus: 'REJECTED' },
    { moderationStatus: null }, { state: 'ARCHIVED' }, { state: 'DELETED' },
    { description: '' }, { contactPhone: 'javascript:alert(1)' },
  ])('refuse une annonce non publique ou invalide %j', (override) => {
    expect(toPublicQuickListing('test', { ...raw, ...override })).toBeNull();
  });
  it('ne dépend pas de la date : aucune expiration automatique', () => {
    expect(toPublicQuickListing('old', { ...raw, createdAt: '2000-01-01' })).not.toBeNull();
  });
  it('affiche une carte sans image, sans prix inventé et avec lien détail', () => {
    const { container } = render(<QuickListingCard item={item} />);
    expect(screen.getByText(/Annonce rapide · Sans photo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lire l’annonce/ })).toHaveAttribute('href', '/annonces-rapides/test-quick');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText(/FCFA/)).toBeNull();
  });
  it('montre toutes les précautions avant le contact et conserve les retours à la ligne', () => {
    render(<QuickListingDetail item={item} />);
    expect(screen.getByText(/Visitez le logement/)).toBeInTheDocument();
    expect(screen.getByText(/aucun acompte ni dépôt/)).toBeInTheDocument();
    expect(screen.getByText(/contrat de bail/)).toBeInTheDocument();
    expect(screen.getByText(/aussi aux annonces avec photos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', 'tel:+24174124961');
    expect(screen.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toContain('https://wa.me/24174124961?text=');
    expect(screen.getByText(/Maison à louer/)).toHaveClass('whitespace-pre-wrap');
  });
  it('ne rend jamais le texte utilisateur comme du HTML', () => {
    const { container } = render(<QuickListingDetail item={{ ...item, description: '<img src=x onerror=alert(1)>' }} />);
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
