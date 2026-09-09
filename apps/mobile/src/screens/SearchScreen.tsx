import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchProperties, type PropertyHit, type SearchFilters } from '../api/algolia';
import { getImageUrl } from '../lib/propertyImage';
import type { SearchStackParamList } from '../navigation/types';

// Les 12 types réels de l'index Algolia (src/components/home-page/PropertyTypeList.tsx côté
// web) — volontairement TOUS présents ici (contrairement à la liste réduite à 6 types du
// formulaire "Demande de recherche") : masquer un type en filtre cacherait des annonces
// existantes de ce type, ce que la recherche ne doit jamais faire.
const PROPERTY_TYPES: Array<{ key: string; label: string }> = [
  { key: 'Home', label: 'Maison' },
  { key: 'Apartment', label: 'Appartement' },
  { key: 'Studio', label: 'Studio' },
  { key: 'Room', label: 'Chambre' },
  { key: 'Villa', label: 'Villa' },
  { key: 'Duplex', label: 'Duplex' },
  { key: 'Building', label: 'Immeuble' },
  { key: 'Desk', label: 'Bureau' },
  { key: 'Shop', label: 'Boutique' },
  { key: 'Kiosk', label: 'Kiosque' },
  { key: 'Warehouse', label: 'Entrepôt' },
  { key: 'Land', label: 'Terrain' },
];

const EMPTY_FILTERS: SearchFilters = {};

function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

function countActiveFilters(filters: SearchFilters): number {
  return (filters.typeProperty?.length ? 1 : 0) + (filters.status ? 1 : 0) + (filters.city ? 1 : 0) + (filters.budgetMaxXaf ? 1 : 0);
}

function ListingRow({ item, onPress }: { item: PropertyHit; onPress: () => void }) {
  const thumbnailUrl = getImageUrl(item.images?.[0], true);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{item.title ?? 'Annonce'}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {[item.city, item.province].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.rowPrice}>
          {formatPrice(item.price)}
          {item.status === 'FOR_RENT' ? ' / mois' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function FiltersModal({
  visible,
  initialFilters,
  onClose,
  onApply,
}: {
  visible: boolean;
  initialFilters: SearchFilters;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}) {
  const [types, setTypes] = useState<string[]>(initialFilters.typeProperty ?? []);
  const [status, setStatus] = useState<SearchFilters['status']>(initialFilters.status);
  const [city, setCity] = useState(initialFilters.city ?? '');
  const [budgetMax, setBudgetMax] = useState(initialFilters.budgetMaxXaf ? String(initialFilters.budgetMaxXaf) : '');

  const toggleType = (key: string) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const handleReset = () => {
    setTypes([]);
    setStatus(undefined);
    setCity('');
    setBudgetMax('');
  };

  const handleApply = () => {
    onApply({
      typeProperty: types.length ? types : undefined,
      status,
      city: city.trim() || undefined,
      budgetMaxXaf: Number(budgetMax) > 0 ? Number(budgetMax) : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtres</Text>

          <Text style={styles.label}>Location ou vente</Text>
          <View style={styles.pillsRow}>
            {(['FOR_RENT', 'FOR_SALE'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pill, status === s && styles.pillActive]}
                onPress={() => setStatus(status === s ? undefined : s)}
              >
                <Text style={[styles.pillText, status === s && styles.pillTextActive]}>
                  {s === 'FOR_RENT' ? 'Location' : 'Vente'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Type de bien</Text>
          <View style={styles.pillsRow}>
            {PROPERTY_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.pill, types.includes(t.key) && styles.pillActive]}
                onPress={() => toggleType(t.key)}
              >
                <Text style={[styles.pillText, types.includes(t.key) && styles.pillTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Ville</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Libreville" />

          <Text style={styles.label}>Budget maximum (FCFA)</Text>
          <TextInput style={styles.input} value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="Ex: 300000" />

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList, 'SearchHome'>>();
  const [searchText, setSearchText] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  const { data, isLoading, isError, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['algolia-search', submittedQuery, filters],
    queryFn: ({ pageParam }) => searchProperties(submittedQuery, pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (allPages.length < lastPage.nbPages ? allPages.length : undefined),
  });

  const hits = data?.pages.flatMap((p) => p.hits) ?? [];
  const activeFiltersCount = countActiveFilters(filters);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-recherche">
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une annonce (ville, type...)"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => setSubmittedQuery(searchText.trim())}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFiltersVisible(true)}>
          <Text style={styles.filterButtonText}>Filtres{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</Text>
        </TouchableOpacity>
      </View>

      {isLoading || isFetching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#146B67" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Impossible de charger les annonces.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(item) => item.objectID}
          renderItem={({ item }) => (
            <ListingRow item={item} onPress={() => navigation.navigate('ListingDetail', { objectID: item.objectID })} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color="#146B67" /> : null}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune annonce trouvée.</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      <FiltersModal
        visible={isFiltersVisible}
        initialFilters={filters}
        onClose={() => setIsFiltersVisible(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', gap: 8, padding: 12 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  filterButton: { backgroundColor: '#146B67', borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' },
  filterButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  thumbnail: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f0f0f0' },
  thumbnailPlaceholder: {},
  rowContent: { flex: 1, gap: 2, justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: '#666' },
  rowPrice: { fontSize: 15, fontWeight: '700', color: '#146B67', marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyText: { color: '#666', fontSize: 14 },
  retryText: { color: '#146B67', fontWeight: '600' },
  modalContent: { padding: 20, gap: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 15 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: '#146B67', borderColor: '#146B67' },
  pillText: { fontSize: 13, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  applyButton: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 28 },
  applyButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetButton: { alignItems: 'center', padding: 12 },
  resetButtonText: { color: '#666', fontSize: 14 },
});
