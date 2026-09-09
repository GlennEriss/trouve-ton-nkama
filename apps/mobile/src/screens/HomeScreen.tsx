import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { Heart, Search, SlidersHorizontal } from 'lucide-react-native';
import { searchProperties, type PropertyHit } from '../api/algolia';
import { getPromotedProperties, getHomeSections, type PropertyListItem } from '../api/property';
import { getImageUrl } from '../lib/propertyImage';
import { useFavoriteIds, addFavorite, removeFavorite } from '../hooks/useFavoriteIds';
import { requireAuthOrRedirect } from '../lib/authGuard';
import { colors } from '../theme/colors';
import { HomeHeroCarousel } from '../components/HomeHeroCarousel';
import { PropertyCarouselSection } from '../components/PropertyCarouselSection';
import { ProvinceChips } from '../components/ProvinceChips';
import type { MainTabParamList } from '../navigation/types';

// Version mobile de HomePageComponent (web), restructurée pour se rapprocher d'une maquette
// de référence fournie (disposition en sections : hero pub, recommandées, tendances, provinces,
// récentes) — mais avec les vraies données/fonctionnalités du produit : pas de note étoilée
// (n'existe pas côté Trouve Ton Nkama), pas de réservation, prix en FCFA. Favoris partout via
// useFavoriteIds, comme ListingDetailScreen.
function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Accueil'>>();
  const { favoriteIds } = useFavoriteIds();

  const { data, isLoading } = useQuery({
    queryKey: ['home-recent-properties'],
    queryFn: () => searchProperties('', 0),
  });
  const { data: promoted } = useQuery({
    queryKey: ['home-promoted-properties'],
    queryFn: getPromotedProperties,
    staleTime: 5 * 60 * 1000,
  });
  // Un rail par catégorie racine active (Immobilier, Mode dès qu'elle a du stock...) — même
  // endpoint que CategoryHomeSections (web), jamais une liste "Immobilier"/"Mode" codée en dur.
  const { data: categorySections = [] } = useQuery({
    queryKey: ['home-category-sections'],
    queryFn: getHomeSections,
    staleTime: 5 * 60 * 1000,
  });

  const openSearch = () => navigation.navigate('Recherche', { screen: 'SearchHome' });
  const openListing = (objectID: string) => navigation.navigate('Recherche', { screen: 'ListingDetail', params: { objectID } });
  const openListingFromPromoted = (property: PropertyListItem) => openListing(property.id);
  const openProvince = (province: string) => navigation.navigate('Recherche', { screen: 'SearchHome', params: { province } });

  const toggleFavorite = (objectID: string) => {
    if (!requireAuthOrRedirect()) return;
    if (favoriteIds.includes(objectID)) removeFavorite(objectID);
    else addFavorite(objectID);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-accueil">
      <FlatList
        data={data?.hits ?? []}
        keyExtractor={(item: PropertyHit) => item.objectID}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        ListHeaderComponent={
          <View style={styles.headerSections}>
            <HomeHeroCarousel />

            <TouchableOpacity style={styles.searchBar} onPress={openSearch} activeOpacity={0.8}>
              <Search size={18} color={colors.mutedText} />
              <Text style={styles.searchPlaceholder}>Rechercher un logement...</Text>
              <SlidersHorizontal size={18} color={colors.primary} />
            </TouchableOpacity>

            <PropertyCarouselSection
              title="Recommandées"
              properties={promoted?.featured ?? []}
              onSeeAll={openSearch}
              onPressItem={openListingFromPromoted}
            />
            <PropertyCarouselSection
              title="Tendances"
              properties={promoted?.trending ?? []}
              onSeeAll={openSearch}
              onPressItem={openListingFromPromoted}
            />

            {categorySections.map((section) => (
              <PropertyCarouselSection
                key={section.id}
                title={section.name}
                properties={section.items}
                onSeeAll={openSearch}
                onPressItem={openListingFromPromoted}
              />
            ))}

            <View style={styles.provinceSection}>
              <Text style={styles.sectionTitle}>Explorer par province</Text>
              <ProvinceChips onSelect={openProvince} />
            </View>

            <Text style={[styles.sectionTitle, styles.recentTitle]}>Annonces récentes</Text>
            {isLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const thumbnailUrl = getImageUrl(item.images?.[0], true);
          const isFavorite = favoriteIds.includes(item.objectID);
          return (
            <TouchableOpacity style={styles.row} onPress={() => openListing(item.objectID)}>
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
              <TouchableOpacity
                style={styles.rowHeart}
                onPress={() => toggleFavorite(item.objectID)}
                accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                <Heart size={18} color={colors.destructive} fill={isFavorite ? colors.destructive : 'transparent'} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune annonce pour l&apos;instant.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerSections: { gap: 20, paddingBottom: 8 },
  searchBar: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: { flex: 1, color: colors.mutedText, fontSize: 14 },
  provinceSection: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, paddingHorizontal: 16 },
  recentTitle: { paddingBottom: 0 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.mutedText, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  thumbnail: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f0f0f0' },
  thumbnailPlaceholder: {},
  rowContent: { flex: 1, gap: 2, justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, color: colors.mutedText },
  rowPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
  rowHeart: { padding: 6 },
});
