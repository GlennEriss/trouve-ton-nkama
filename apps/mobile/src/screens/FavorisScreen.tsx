import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { useFavoriteIds } from '../hooks/useFavoriteIds';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { getPropertyById } from '../api/property';
import { formatListingZones } from '../lib/listingZones';
import { navigationRef } from '../navigation/navigationRef';

function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

// Favoris est un Drawer.Screen de premier niveau (pas sous MainTabs, voir DrawerParamList) —
// pour naviguer vers l'annonce (imbriquée sous Main > MainTabs > Recherche), le navigationRef
// global est utilisé plutôt que useNavigation() local, comme pour toute navigation inter-
// navigateurs déjà en place (voir usePushNotificationRouting.ts, authGuard.ts).
function openListing(objectID: string) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Main', { screen: 'MainTabs', params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID } } } });
}

export default function FavorisScreen() {
  const { isChecking } = useRequireAuth();
  const { favoriteIds, isLoading: isLoadingIds } = useFavoriteIds();
  const propertyQueries = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ['property', id],
      queryFn: () => getPropertyById(id),
    })),
  });

  const isLoading = isLoadingIds || propertyQueries.some((q) => q.isLoading);
  const properties = propertyQueries.map((q) => q.data).filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Redirection vers SignIn déjà déclenchée par useRequireAuth (voir ce hook) — le temps
  // qu'elle s'effectue, ne rien afficher plutôt qu'un flash de contenu vide. Placé après tous
  // les hooks (règle des hooks : jamais de return conditionnel entre deux appels de hooks).
  if (isChecking) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Favoris</Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#146B67" />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openListing(item.id)}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {item.cities && item.cities.length > 1
                  ? formatListingZones(item)
                  : [item.city, item.province].filter(Boolean).join(', ')}
              </Text>
              <Text style={styles.rowPrice}>{formatPrice(item.price)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune annonce en favoris pour l&apos;instant.</Text>
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
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666' },
  rowPrice: { fontSize: 15, fontWeight: '700', color: '#146B67', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 14 },
});
