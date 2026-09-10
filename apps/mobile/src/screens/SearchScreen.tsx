import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { searchProperties, type SearchFilters } from '../api/algolia';
import { getActiveCategories, getPublishableLeaves, type PublishableCategoryLeaf } from '../api/categories';
import { toPropertyListItem } from '../lib/propertyMapping';
import { colors } from '../theme/colors';
import { PropertyCard } from '../components/PropertyCard';
import { ChipExpander, type ChipOption } from '../components/ChipExpander';
import type { SearchStackParamList } from '../navigation/types';

const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / 2;

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

function countActiveFilters(filters: SearchFilters): number {
  const attributeCount = Object.values(filters.attributes ?? {}).filter((v) => v?.length).length;
  return (
    (filters.typeProperty?.length ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.budgetMaxXaf ? 1 : 0) +
    attributeCount
  );
}

function FiltersModal({
  visible,
  initialFilters,
  leaf,
  onClose,
  onApply,
}: {
  visible: boolean;
  initialFilters: SearchFilters;
  // Feuille Mode active (ex. "Chaussures") — pilote les filtres d'attributs dynamiques
  // (pointure, état...) affichés en bas de la modale. undefined hors scope Mode ou tant
  // qu'aucune feuille n'est choisie.
  leaf?: PublishableCategoryLeaf;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}) {
  const [types, setTypes] = useState<string[]>(initialFilters.typeProperty ?? []);
  const [status, setStatus] = useState<SearchFilters['status']>(initialFilters.status);
  const [city, setCity] = useState(initialFilters.city ?? '');
  const [budgetMax, setBudgetMax] = useState(initialFilters.budgetMaxXaf ? String(initialFilters.budgetMaxXaf) : '');
  const [attributes, setAttributes] = useState<Record<string, string[]>>(initialFilters.attributes ?? {});

  // Resynchronise l'état local à CHAQUE ouverture (pas seulement au premier montage — la
  // modale reste montée en permanence, seule `visible` change) : sans ça, changer de
  // catégorie via les pills (qui réinitialise `filters` côté écran) laissait cette modale
  // afficher des champs encore cochés d'une recherche précédente.
  useEffect(() => {
    if (!visible) return;
    setTypes(initialFilters.typeProperty ?? []);
    setStatus(initialFilters.status);
    setCity(initialFilters.city ?? '');
    setBudgetMax(initialFilters.budgetMaxXaf ? String(initialFilters.budgetMaxXaf) : '');
    setAttributes(initialFilters.attributes ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isImmobilierScope = !initialFilters.category || initialFilters.category === 'Immobilier';
  // Seuls les champs "enum" (valeurs fixes déjà dans le schéma) sont filtrables ici — "marque"
  // (type "text") nécessiterait une requête de facette Algolia en direct, hors scope pour
  // préserver le passage exclusif par le proxy /api/algolia/search (voir categories.ts).
  const attributeFields = (leaf?.attributeSchema ?? [])
    .filter((f) => f.facetable && f.type === 'enum')
    .sort((a, b) => Number(b.primary) - Number(a.primary));

  const toggleType = (key: string) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const toggleAttributeValue = (key: string, value: string) => {
    setAttributes((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleReset = () => {
    setTypes([]);
    setStatus(undefined);
    setCity('');
    setBudgetMax('');
    setAttributes({});
  };

  const handleApply = () => {
    onApply({
      ...initialFilters,
      typeProperty: types.length ? types : undefined,
      status,
      city: city.trim() || undefined,
      budgetMaxXaf: Number(budgetMax) > 0 ? Number(budgetMax) : undefined,
      attributes: Object.values(attributes).some((v) => v.length) ? attributes : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }} testID="filters-modal">
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity
              testID="filters-close"
              onPress={onClose}
              accessibilityLabel="Fermer les filtres"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeButton}
            >
              <X size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {isImmobilierScope && (
            <>
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
            </>
          )}

          <Text style={styles.label}>Ville</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Libreville" />

          <Text style={styles.label}>Budget maximum (FCFA)</Text>
          <TextInput style={styles.input} value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="Ex: 300000" />

          {attributeFields.map((field) => (
            <View key={field.key}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.pillsRow}>
                {(field.options ?? []).map((option) => {
                  const isActive = (attributes[field.key] ?? []).includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => toggleAttributeValue(field.key, option)}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity testID="filters-apply" style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="filters-reset" style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList, 'SearchHome'>>();
  const route = useRoute<RouteProp<SearchStackParamList, 'SearchHome'>>();
  const [searchText, setSearchText] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  // Pré-rempli si on arrive depuis une chip "Explorer par province" de l'accueil (voir
  // ProvinceChips.tsx) — lu une seule fois au montage : on ne veut pas écraser un filtre que
  // l'utilisateur aurait déjà changé manuellement si l'écran restait monté avec de nouveaux params.
  const [filters, setFilters] = useState<SearchFilters>(() =>
    route.params?.province ? { ...EMPTY_FILTERS, province: route.params.province } : EMPTY_FILTERS,
  );
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Mêmes endpoints que CategoryFilterPills/CategoryLeafFilterPills (web) — aucune catégorie
  // codée en dur, tout vient de /api/categories/active et /api/categories/publishable-leaves.
  const { data: categories = [] } = useQuery({
    queryKey: ['active-categories'],
    queryFn: getActiveCategories,
    staleTime: 10 * 60 * 1000,
  });
  const { data: leaves = [] } = useQuery({
    queryKey: ['publishable-leaves'],
    queryFn: getPublishableLeaves,
    staleTime: 10 * 60 * 1000,
  });
  const relevantLeaves = leaves.filter((l) => l.rootName === filters.category);
  const activeLeaf = leaves.find((l) => l.id === filters.categoryId);

  // Changement de catégorie racine = réinitialisation complète des filtres (seule la recherche
  // texte libre traverse le changement, voir CategoryFilterPills.tsx web) : un filtre laissé
  // d'une autre section resterait sinon actif sans qu'aucun contrôle ne le montre.
  const selectCategory = (name: string) => {
    setFilters(name ? { category: name } : {});
  };
  // Changement de feuille = seuls categoryId + attributs repartent à zéro (voir
  // CategoryLeafFilterPills.tsx web) : les autres filtres (ville, budget...) restent pertinents.
  const selectLeaf = (id: string) => {
    setFilters((prev) => ({ ...prev, categoryId: id || undefined, attributes: undefined }));
  };
  // Sélection simple (remplace, ne cumule pas) — comme selectLeaf, ne touche qu'à son propre
  // champ, laisse ville/budget/statut intacts.
  const selectPropertyType = (key: string) => {
    setFilters((prev) => ({ ...prev, typeProperty: key ? [key] : undefined }));
  };

  const { data, isLoading, isError, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['algolia-search', submittedQuery, filters],
    queryFn: ({ pageParam }) => searchProperties(submittedQuery, pageParam, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (allPages.length < lastPage.nbPages ? allPages.length : undefined),
    // Revisiter un filtre déjà consulté (Immobilier → Mode → Immobilier) sert le résultat en
    // cache instantanément au lieu de refetch.
    staleTime: 60 * 1000,
    // Garde la liste précédente visible pendant le refetch d'un nouveau filtre au lieu de
    // blanchir tout l'écran avec un spinner — la latence perçue chute nettement.
    placeholderData: keepPreviousData,
  });

  const hits = data?.pages.flatMap((p) => p.hits) ?? [];
  const activeFiltersCount = countActiveFilters(filters);

  return (
    <SafeAreaView style={styles.container} edges={[]} testID="screen-recherche">
      <View style={styles.searchBar}>
        <Search size={18} color={colors.mutedText} />
        <TextInput
          testID="search-input"
          style={styles.searchInput}
          placeholder="Rechercher une annonce (ville, type...)"
          placeholderTextColor={colors.mutedText}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={() => setSubmittedQuery(searchText.trim())}
          returnKeyType="search"
        />
        <TouchableOpacity testID="search-filters-button" onPress={() => setIsFiltersVisible(true)} accessibilityLabel="Filtres">
          <SlidersHorizontal size={18} color={colors.primary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.categoryPillsRow}>
        <TouchableOpacity
          testID="category-pill-toutes"
          style={[styles.pill, !filters.category && styles.pillActive]}
          onPress={() => selectCategory('')}
        >
          <Text style={[styles.pillText, !filters.category && styles.pillTextActive]}>Toutes catégories</Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            testID={`category-pill-${category.slug}`}
            style={[styles.pill, filters.category === category.name && styles.pillActive]}
            onPress={() => selectCategory(category.name)}
          >
            <Text style={[styles.pillText, filters.category === category.name && styles.pillTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sous-catégories repliables (voir ChipExpander) — Mode a ses vraies feuilles
          listing_categories ; Immobilier n'en a pas (typeProperty est un champ plat), on
          réutilise PROPERTY_TYPES. Les deux partagent `filters.typeProperty` / `filters.categoryId`. */}
      {relevantLeaves.length >= 2 && (
        <ChipExpander
          label="Sous-catégorie"
          allLabel={`Tout ${filters.category}`}
          options={relevantLeaves.map((l): ChipOption => ({ id: l.slug, label: l.name }))}
          selectedId={activeLeaf?.slug}
          onSelect={(slug) => selectLeaf(relevantLeaves.find((l) => l.slug === slug)?.id ?? '')}
          pillTestID="leaf-pill"
        />
      )}

      {filters.category === 'Immobilier' && (
        <ChipExpander
          label="Type de bien"
          allLabel="Tout Immobilier"
          options={PROPERTY_TYPES.map((t): ChipOption => ({ id: t.key, label: t.label }))}
          selectedId={filters.typeProperty?.[0]}
          onSelect={selectPropertyType}
          pillTestID="type-pill"
        />
      )}

      {isLoading ? (
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
        <View style={{ flex: 1 }}>
          {/* Barre fine (statique, pas d'ActivityIndicator qui animerait en continu) visible
              pendant un refetch : la liste reste affichée dessous grâce à placeholderData, plus
              de spinner plein écran. */}
          {isFetching && !isFetchingNextPage && <View testID="search-refetch-bar" style={styles.refetchBar} />}
        <FlatList
          testID="search-results-list"
          data={hits}
          keyExtractor={(item) => item.objectID}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <PropertyCard
              property={toPropertyListItem(item)}
              onPress={() => navigation.navigate('ListingDetail', { objectID: item.objectID })}
              width={CARD_WIDTH}
            />
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
          contentContainerStyle={styles.gridContent}
        />
        </View>
      )}

      <FiltersModal
        visible={isFiltersVisible}
        initialFilters={filters}
        leaf={activeLeaf}
        onClose={() => setIsFiltersVisible(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  // Même pill unifiée que la barre de recherche de l'accueil (HomeScreen.tsx) — demande
  // explicite de reprendre ce design ici plutôt que les deux éléments séparés d'origine
  // (TextInput encadré + bouton "Filtres" plein).
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  refetchBar: { height: 3, backgroundColor: colors.secondary },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground, padding: 0 },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // Même grille 2 colonnes que "Annonces récentes" sur l'accueil (HomeScreen.tsx) — demande
  // explicite de reprendre ce design de carte ici aussi, à la place de l'ancienne liste en
  // lignes horizontales.
  gridContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 16 },
  gridRow: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING, marginBottom: 16 },
  // Pills catégorie (Toutes/Immobilier/Mode) et sous-catégorie Mode — mêmes styles pill/
  // pillActive/pillText/pillTextActive que la modale Filtres, juste dans une rangée qui wrap.
  categoryPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyText: { color: '#666', fontSize: 14 },
  retryText: { color: '#146B67', fontWeight: '600' },
  modalContent: { padding: 20, gap: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  closeButton: { padding: 8 },
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
