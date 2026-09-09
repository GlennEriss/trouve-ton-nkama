import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Réels (V2) et Publier une annonce depuis mobile (V1.1, via le formulaire assisté par IA)
// restent visibles dans la structure de navigation pour rester fidèle à la barre de la PWA
// (voir [[feedback-mobile-reuse-pwa-design]]) — mais leur contenu réel est hors du scope V1
// déjà verrouillé.
export default function ComingSoonScreen({ title, testID }: { title: string; testID?: string }) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Bientôt disponible dans l&apos;application.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: 14, color: colors.mutedText, textAlign: 'center' },
});
