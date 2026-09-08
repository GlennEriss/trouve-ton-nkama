import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Sentry } from '../lib/sentry';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

// Équivalent RN de error.tsx/global-error.tsx côté web (ajoutés cette session après le crash
// public sur /publicite) : sans ça, une exception de rendu laisse un écran figé sans aucun
// retour pour l'utilisateur — pire sur mobile, où il n'y a pas de console à ouvrir pour
// comprendre ce qui s'est passé.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>
            Redémarrez l&apos;application. Si le problème persiste, contactez-nous.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
