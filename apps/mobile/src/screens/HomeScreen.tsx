import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { searchProperties, type PropertyHit } from '../api/algolia';
import { getImageUrl } from '../lib/propertyImage';
import { colors } from '../theme/colors';
import type { MainTabParamList } from '../navigation/types';

// Version simplifiée de HomePageComponent (web) pour la V1 mobile — annonces récentes
// uniquement, sans le contenu marketing/SEO (hors scope mobile, voir la note "Never on
// mobile" du projet). Distinct de l'onglet Recherche, qui reste la recherche avec filtres.
function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Accueil'>>();
  const { data, isLoading } = useQuery({
    queryKey: ['home-recent-properties'],
    queryFn: () => searchProperties('', 0),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Annonces récentes</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data?.hits ?? []}
          keyExtractor={(item: PropertyHit) => item.objectID}
          renderItem={({ item }) => {
            const thumbnailUrl = getImageUrl(item.images?.[0], true);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('Recherche', { screen: 'ListingDetail', params: { objectID: item.objectID } })}
              >
                {thumbnailUrl ? (
                  <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
                )}
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title ?? 'Annonce'}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>{[item.city, item.province].filter(Boolean).join(', ')}</Text>
                  <Text style={styles.rowPrice}>
                    {formatPrice(item.price)}
                    {item.status === 'FOR_RENT' ? ' / mois' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune annonce pour l&apos;instant.</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '700', padding: 16, paddingBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.mutedText, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  thumbnail: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f0f0f0' },
  thumbnailPlaceholder: {},
  rowContent: { flex: 1, gap: 2, justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: colors.mutedText },
  rowPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
});
