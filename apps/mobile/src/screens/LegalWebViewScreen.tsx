import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';

// CGU / politique de confidentialité / suppression des données : contenu affiché via WebView
// pointant sur les pages web existantes (source de vérité unique) plutôt que dupliqué en JSX
// natif — un texte légal a un seul endroit où il doit changer, jamais deux copies qui peuvent
// diverger. Voir src/app/(public)/{terms-of-use,privacy-policy,data-deletion}/page.tsx côté web.
const LEGAL_URLS: Record<ProfileStackParamList['Legal']['page'], string> = {
  terms: 'https://www.tonnkama.com/terms-of-use',
  privacy: 'https://www.tonnkama.com/privacy-policy',
  dataDeletion: 'https://www.tonnkama.com/data-deletion',
};

type Props = NativeStackScreenProps<ProfileStackParamList, 'Legal'>;

export default function LegalWebViewScreen({ route }: Props) {
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
