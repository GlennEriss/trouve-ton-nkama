import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { getPropertyCountByProvince } from '../api/property';
import { HOME_PROVINCES, getProvinceImageUrl } from '../constantes/homeProvinces';

// Équivalent de PropertyByProvince (web) — vraies provinces du Gabon (pas de villes génériques),
// mêmes images (logo `g1.webp`...`g9.webp`, en `contain` sur fond clair, pas des photos plein
// cadre) et même comptage réel (`/api/property/count/summary`) que le web.
export function ProvinceChips({ onSelect }: { onSelect: (province: string) => void }) {
  const { data: counts = {} } = useQuery({
    queryKey: ['province-counts'],
    queryFn: getPropertyCountByProvince,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <FlatList
      data={HOME_PROVINCES}
      keyExtractor={(item) => item.name}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const count = counts[item.name] ?? 0;
        return (
          <TouchableOpacity style={styles.chip} onPress={() => onSelect(item.name)} activeOpacity={0.85}>
            <Image source={{ uri: getProvinceImageUrl(item.logo) }} style={styles.chipImage} resizeMode="contain" />
            <LinearGradient colors={['transparent', 'rgba(2,20,18,0.85)']} style={styles.chipOverlay} />
            <View style={styles.chipContent}>
              <Text style={styles.chipName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.chipCount}>{count > 0 ? `${count} annonce${count > 1 ? 's' : ''}` : 'Aucune annonce'}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const CHIP_WIDTH = 140;
const CHIP_HEIGHT = 130;

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 10 },
  chip: {
    width: CHIP_WIDTH,
    height: CHIP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#EFF6FF',
  },
  chipImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 20 },
  chipOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  chipContent: { flex: 1, justifyContent: 'flex-end', padding: 8 },
  chipName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chipCount: { color: '#fff', fontSize: 10, opacity: 0.9, marginTop: 2 },
});
