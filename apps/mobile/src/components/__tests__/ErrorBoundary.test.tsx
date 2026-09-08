import type React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

jest.mock('@sentry/react-native');

function Bomb(): React.ReactElement {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Le composant qui throw pollue la console pendant le rendu contrôlé (comportement React
    // normal) — silencié pour ne pas polluer la sortie du test, réactivé juste après.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('rend les enfants normalement en l\'absence d\'erreur', async () => {
    await render(
      <ErrorBoundary>
        <Text>Contenu normal</Text>
      </ErrorBoundary>,
    );
    expect(await screen.findByText('Contenu normal')).toBeTruthy();
  });

  it("affiche l'écran de repli et reporte à Sentry quand un enfant lève une exception", async () => {
    await render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(await screen.findByText('Une erreur est survenue')).toBeTruthy();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ extra: expect.objectContaining({ componentStack: expect.any(String) }) }),
    );
  });
});
