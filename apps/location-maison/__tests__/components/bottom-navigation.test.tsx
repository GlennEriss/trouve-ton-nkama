import React from 'react';
import { render, screen } from '@testing-library/react';
import { BottomNavigation } from '@/components/shared/BottomNavigation';
import { routes } from '@/constantes/routes';
let pathname = '/';
let user: any;
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user }) }));
jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter' }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
beforeEach(() => { pathname = '/'; user = { roles: ['Announcer'] }; });
it('affiche les cinq destinations annonceur sans changer Publier', () => {
  render(<BottomNavigation />);
  expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['Accueil', 'Recherche', 'Publier', 'Réels', 'Profil']);
  for (const [name, href] of [['Accueil', '/'], ['Recherche', routes.public.search], ['Publier', routes.protected.publish], ['Réels', routes.protected.reels], ['Profil', routes.protected.profil]]) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
  }
});
it('active Accueil seulement à la racine', () => {
  const { rerender } = render(<BottomNavigation />);
  expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page');
  pathname = routes.protected.properties;
  rerender(<BottomNavigation />);
  expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
});
it('conserve la navigation des comptes non annonceurs', () => {
  user = { roles: ['User'] }; render(<BottomNavigation />);
  expect(screen.getAllByRole('link').map(link => link.textContent)).toEqual(['Recherche', 'Pub', 'Favoris', 'Réels', 'Profil']);
});
it('conserve la navigation visiteur', () => {
  user = undefined; render(<BottomNavigation />);
  expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Connexion' })).toHaveAttribute('href', routes.public.signin);
});
it('reste masquée dans l’éditeur de réel', () => {
  pathname = routes.protected.reels_add; render(<BottomNavigation />);
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
