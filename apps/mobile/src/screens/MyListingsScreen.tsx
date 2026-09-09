import React from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { listMyListings, moderationLabel, type MyListingItem } from '../api/myListings';

const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.tonnkama.com';

function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

function ListingRow({ item }: { item: MyListingItem }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.badge, item.moderationStatus === 'APPROVED' ? styles.badgeApproved : item.moderationStatus === 'REJECTED' ? styles.badgeRejected : styles.badgePending]}>
          <Text style={styles.badgeText}>{moderationLabel(item.moderationStatus)}</Text>
        </View>
      </View>
      <Text style={styles.rowMeta}>{item.city} · {item.status === 'FOR_RENT' ? 'Location' : 'Vente'}</Text>
      <Text style={styles.rowPrice}>{formatPrice(item.price)}</Text>
      {item.state === 'ARCHIVED' && <Text style={styles.archivedText}>Archivée</Text>}
    </View>
  );
}

// V1 : lecture seule (liste + statut des annonces déjà publiées par ce compte) + bouton
// "Continuer sur le site web" pour tout ce qui est création/modification — décision produit
// explicite, voir le fil de discussion sur les annonceurs existants qui se connectent à la V1.
export default function MyListingsScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: listMyListings,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.headerTitle}>Mes annonces</Text>
      <Text style={styles.headerSubtitle}>
        La création et la modification d&apos;annonces se font pour l&apos;instant sur le site web.
      </Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#146B67" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingRow item={item} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Vous n&apos;avez pas encore d&apos;annonce.</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      <TouchableOpacity style={styles.webButton} onPress={() => Linking.openURL(`${WEB_BASE_URL}/announcer/ads`)}>
        <Text style={styles.webButtonText}>Continuer sur le site web</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 14 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  rowMeta: { fontSize: 13, color: '#444' },
  rowPrice: { fontSize: 14, fontWeight: '700', color: '#146B67' },
  archivedText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeApproved: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  badgePending: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#333' },
  webButton: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 12 },
  webButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
