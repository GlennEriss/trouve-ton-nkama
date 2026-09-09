import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { PropertyListItem } from '../api/property';
import { PropertyCard } from './PropertyCard';
import { colors } from '../theme/colors';

// Section "carousel horizontal" réutilisée pour Recommandées/Tendances (voir HomeScreen.tsx) —
// masquée si vide, comme FeaturedSection/TrendingSection côté web (pas de section vide affichée).
export function PropertyCarouselSection({
  title,
  properties,
  onSeeAll,
  onPressItem,
}: {
  title: string;
  properties: PropertyListItem[];
  onSeeAll: () => void;
  onPressItem: (property: PropertyListItem) => void;
}) {
  if (properties.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PropertyCard property={item} onPress={() => onPressItem(item)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primary },
  list: { paddingHorizontal: 16, gap: 12 },
});
