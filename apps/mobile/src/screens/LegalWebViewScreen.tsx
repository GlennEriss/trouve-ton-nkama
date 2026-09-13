import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import TermsOfUseScreen from './TermsOfUseScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

// Suppression des données : seule page légale encore affichée via WebView pointant sur la page
// web existante (source de vérité unique) plutôt que dupliquée en JSX natif — un texte légal a
// un seul endroit où il doit changer, jamais deux copies qui peuvent diverger. Voir
// src/app/(public)/data-deletion/page.tsx côté web.
// "terms" et "privacy" font exception : écrans natifs dédiés (TermsOfUseScreen,
// PrivacyPolicyScreen) — demande explicite de vrais écrans accessibles plutôt que le chargement
// réseau d'une page web pour ces textes.
const LEGAL_URLS: Record<Extract<ProfileStackParamList['Legal']['page'], 'dataDeletion'>, string> = {
  dataDeletion: 'https://www.tonnkama.com/data-deletion',
};

type Props = NativeStackScreenProps<ProfileStackParamList, 'Legal'>;

export default function LegalWebViewScreen({ route }: Props) {
  if (route.params.page === 'terms') {
    return <TermsOfUseScreen />;
  }
  if (route.params.page === 'privacy') {
    return <PrivacyPolicyScreen />;
  }

  return (
    // testID sur le conteneur (pas la WebView elle-même) : son contenu est une page distante,
    // hors de portée de l'arbre d'accessibilité RN — ce testID identifie seulement "on est sur
    // la bonne page légale", indépendamment du chargement réseau du contenu web.
    <View style={styles.container} testID={`screen-legal-${route.params.page}`}>
      <WebView
        source={{ uri: LEGAL_URLS[route.params.page] }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#146B67" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
