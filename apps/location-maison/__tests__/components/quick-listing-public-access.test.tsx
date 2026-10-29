import { render, screen } from '@testing-library/react';
import PublishChoiceClient from '@/components/publish/PublishChoiceClient';
import Page from '@/app/(public)/annonces-rapides/publier/page';

jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: null }) }));
jest.mock('@/components/quick-listings/QuickListingForm', () => ({ __esModule: true, default: () => <div>Formulaire public</div> }));

describe('Accès anonyme aux annonces rapides', () => {
  it('propose la création rapide dans Publier sans session', () => {
    render(<PublishChoiceClient />);
    expect(screen.getByRole('link', { name: /Créer une annonce rapide/ })).toHaveAttribute('href', '/annonces-rapides/publier');
  });
  it('rend le formulaire sans authentification serveur', () => {
    render(<Page />);
    expect(screen.getByText('Formulaire public')).toBeInTheDocument();
  });
});
