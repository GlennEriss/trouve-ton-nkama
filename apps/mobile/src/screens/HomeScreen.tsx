import React from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { searchProperties, type PropertyHit } from '../api/algolia';
import { getPromotedProperties, getHomeSections, type PropertyListItem } from '../api/property';
import { toPropertyListItem } from '../lib/propertyMapping';
import { colors } from '../theme/colors';
import { HomeHeroCarousel } from '../components/HomeHeroCarousel';
import { PropertyCarouselSection } from '../components/PropertyCarouselSection';
import { PropertyCard } from '../components/PropertyCard';
import { ProvinceChips } from '../components/ProvinceChips';
import type { MainTabParamList } from '../navigation/types';

// Version mobile de HomePageComponent (web), restructurée pour se rapprocher d'une maquette
// de référence fournie (disposition en sections : hero pub, recommandées, tendances, provinces,
// récentes) — mais avec les vraies données/fonctionnalités du produit : pas de note étoilée
// (n'existe pas côté Trouve Ton Nkama), pas de réservation, prix en FCFA. "Annonces récentes"
// utilise la même carte (PropertyCard) que Recommandées/Tendances/Immobilier/Mode, en grille à
// 2 colonnes — demande explicite : un seul design de carte partout sur la page.
const GRID_GAP = 12;
const GRID_PADDING = 16;
const CARD_WIDTH = (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Accueil'>>();

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

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-accueil">
      <FlatList
        data={data?.hits ?? []}
        keyExtractor={(item: PropertyHit) => item.objectID}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        ListHeaderComponent={
          <View style={styles.headerSections}>
            <HomeHeroCarousel />

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

            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>Annonces récentes</Text>
              <TouchableOpacity onPress={openSearch}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {isLoading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PropertyCard property={toPropertyListItem(item)} onPress={() => openListing(item.objectID)} width={CARD_WIDTH} />
        )}
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
  provinceSection: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, paddingHorizontal: 16 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { fontSize: 13, fontWeight: '600', color: colors.primary, paddingRight: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.mutedText, fontSize: 14 },
  gridContent: { flexGrow: 1, paddingTop: 12, paddingBottom: 16 },
  // padding horizontal ici (pas sur gridContent) : le ListHeaderComponent gère déjà son propre
  // padding par section (searchBar, sectionTitle...) — un padding partagé aurait doublé leurs
  // marges internes.
  gridRow: { gap: GRID_GAP, paddingHorizontal: GRID_PADDING, marginBottom: 16 },
});
