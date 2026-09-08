import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Coquille pour un écran de la V1 pas encore implémenté — la navigation/le shell est réel,
 * le contenu vient dans une passe suivante, écran par écran. */
export function PlaceholderScreen({ title, note }: { title: string; note?: string }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {note && <Text style={styles.note}>{note}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  note: { fontSize: 14, color: '#666', textAlign: 'center' },
});
