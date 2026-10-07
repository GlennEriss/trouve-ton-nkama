import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuth } from '@react-native-firebase/auth';
import {
  Archive,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CircleCheck,
  Eye,
  Layers3,
  MapPin,
  Pencil,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Video,
  X,
} from 'lucide-react-native';
import { deleteListing, listMyListings, moderationLabel, setListingState, type MyListingItem } from '../api/myListings';
import { formatListingZones } from '../lib/listingZones';
import { getImageUrl } from '../lib/propertyImage';
import { navigationRef } from '../navigation/navigationRef';
import { colors } from '../theme/colors';

const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.tonnkama.com';

type StateFilter = 'ALL' | 'IN_PROGRESS' | 'ARCHIVED';
type PromotedFilter = 'ALL' | 'PROMOTED' | 'NOT_PROMOTED';
type SortKey = 'recent' | 'oldest' | 'price_asc' | 'price_desc' | 'updated_desc' | 'title_asc';
type Scope = 'immobilier' | 'marketplace';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Plus récentes' },
  { value: 'oldest', label: 'Plus anciennes' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'updated_desc', label: 'Dernière mise à jour' },
  { value: 'title_asc', label: 'Titre A → Z' },
];

// Mêmes libellés que PROPERTY_TYPES (SearchScreen.tsx) — pas une nouvelle liste inventée.
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Home: 'Maison',
  Apartment: 'Appartement',
  Studio: 'Studio',
  Room: 'Chambre',
  Villa: 'Villa',
  Duplex: 'Duplex',
  Building: 'Immeuble',
  Desk: 'Bureau',
  Shop: 'Boutique',
  Kiosk: 'Kiosque',
  Warehouse: 'Entrepôt',
  Land: 'Terrain',
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toMs(value: unknown): number {
  return toDate(value)?.getTime() ?? 0;
}

function formatDate(value: unknown): string {
  const parsed = toDate(value);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPrice(value: number): string {
  return `${(value || 0).toLocaleString('fr-FR')} FCFA`;
}

// Immobilier (typeProperty présent) : "Maison • 90 m²". Mode (categoryId, pas de typeProperty) :
// le nom de la feuille de catégorie, sans surface — même logique que resolveAdSubtitle (web).
function resolveSubtitle(item: MyListingItem): string {
  if (item.typeProperty) {
    return `${PROPERTY_TYPE_LABELS[item.typeProperty] ?? item.typeProperty} • ${item.area || 0} m²`;
  }
  const leafName = item.categoryPath?.lvl1?.split(' > ').pop();
  return leafName ?? 'Annonce';
}

// Immobilier ou zone unique : street/city/province classique. Plusieurs zones (Mode) : villes
// uniquement — même logique que resolveAdLocation (web).
function resolveLocation(item: MyListingItem): string {
  const zones = item.cities && item.cities.length > 0 ? item.cities : item.city ? [item.city] : [];
  if (item.typeProperty || zones.length <= 1) {
    return [item.street, item.city, item.province].filter(Boolean).join(', ');
  }
  return [item.street, formatListingZones(item)].filter(Boolean).join(', ');
}

function resolveStatusLabel(item: MyListingItem): string {
  if (item.typeProperty) {
    return item.status === 'FOR_RENT' ? 'À louer' : 'À vendre';
  }
  return item.categoryPath?.lvl1?.split(' > ').pop() ?? 'Annonce';
}

function isMarketplaceItem(item: MyListingItem): boolean {
  return !item.typeProperty;
}

function sortItems(items: MyListingItem[], sort: SortKey): MyListingItem[] {
  const sorted = [...items];
  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
    case 'price_asc':
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'updated_desc':
      return sorted.sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
    case 'title_asc':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'recent':
    default:
      return sorted.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }
}

function StatCard({
  title,
  value,
  icon,
  testID,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  testID: string;
}) {
  const formattedValue = value.toLocaleString('fr-FR');

  return (
    <View
      testID={testID}
      style={styles.statCard}
      accessible
      accessibilityLabel={`${formattedValue} ${title.toLocaleLowerCase('fr-FR')}`}
    >
      <View testID={`${testID}-header`} style={styles.statHeader}>
        <View style={styles.statIcon}>{icon}</View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{formattedValue}</Text>
    </View>
  );
}

function ListingCard({
  item,
  isBusy,
  onView,
  onEdit,
  onToggleState,
  onDelete,
  onAddReel,
}: {
  item: MyListingItem;
  isBusy: boolean;
  onView: (item: MyListingItem) => void;
  onEdit: (item: MyListingItem) => void;
  onToggleState: (item: MyListingItem) => void;
  onDelete: (item: MyListingItem) => void;
  onAddReel: (item: MyListingItem) => void;
}) {
  const thumbnailUrl = getImageUrl(item.images?.[0], true);
  const modLabel = item.moderationStatus ? moderationLabel(item.moderationStatus) : null;

  return (
    <View testID={`my-listings-card-${item.id}`} style={styles.card}>
      <View style={styles.imageWrapper}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.badgeRow}>
          <View style={styles.badgeWhite}>
            <Text style={styles.badgeWhiteText}>{resolveStatusLabel(item)}</Text>
          </View>
          <View style={[styles.badge, item.state === 'IN_PROGRESS' ? styles.badgeSuccess : styles.badgeWarning]}>
            <Text style={styles.badgeText}>{item.state === 'IN_PROGRESS' ? 'Active' : 'Archivée'}</Text>
          </View>
          {modLabel && (
            <View
              style={[
                styles.badge,
                item.moderationStatus === 'APPROVED'
                  ? styles.badgeSuccess
                  : item.moderationStatus === 'REJECTED'
                    ? styles.badgeDestructive
                    : styles.badgeWarning,
              ]}
            >
              <Text style={styles.badgeText}>{modLabel}</Text>
            </View>
          )}
          {item.isPromoted && (
            <View style={[styles.badge, styles.badgeAccent]}>
              <BadgeDollarSign size={11} color="#fff" />
              <Text style={styles.badgeText}>Promue</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>{item.title || 'Annonce sans titre'}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{resolveSubtitle(item)}</Text>

        {item.moderationStatus === 'REJECTED' && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionText}>Motif du rejet : {item.rejectionReason}</Text>
          </View>
        )}

        <View style={styles.locationRow}>
          <MapPin size={14} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>{resolveLocation(item)}</Text>
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <CalendarDays size={12} color={colors.mutedText} />
              <Text style={styles.dateText}>Publiée: {formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.dateText}>Maj: {formatDate(item.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity testID={`my-listings-view-${item.id}`} style={styles.actionButton} onPress={() => onView(item)}>
            <Eye size={16} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity testID={`my-listings-edit-${item.id}`} style={styles.actionButton} onPress={() => onEdit(item)}>
            <Pencil size={16} color={colors.foreground} />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`my-listings-toggle-${item.id}`}
            style={styles.actionButton}
            onPress={() => onToggleState(item)}
            disabled={isBusy}
          >
            <Archive size={16} color={colors.foreground} />
            <Text style={styles.actionButtonText}>{item.state === 'IN_PROGRESS' ? 'Archiver' : 'Réactiver'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={`my-listings-delete-${item.id}`}
            style={styles.actionButton}
            onPress={() => onDelete(item)}
            disabled={isBusy}
          >
            <Trash2 size={16} color={colors.destructive} />
            <Text style={[styles.actionButtonText, { color: colors.destructive }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity testID={`my-listings-add-reel-${item.id}`} style={styles.reelButton} onPress={() => onAddReel(item)}>
          <Video size={16} color={colors.foreground} />
          <Text style={styles.actionButtonText}>Ajouter un réel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Reproduit /property (AdManagementPage.tsx, web) — voir [[feedback-mobile-reuse-pwa-design]] :
// mêmes stats, mêmes filtres (État/Promotion/Prix/Tri), même recherche, mêmes actions par
// annonce (Voir/Modifier/Archiver ou Réactiver/Supprimer/Ajouter un réel), mêmes libellés et
// mêmes textes de confirmation/succès/erreur. Écarts assumés, chacun documenté à son usage :
// - Recherche/filtres/tri appliqués en direct sur la liste déjà chargée (une seule requête
//   Firestore, pas d'appel serveur par filtre) — pas de bouton "Voir les résultats" séparé.
// - Pas de pagination infinie : le nombre d'annonces d'un même compte reste modeste, tout est
//   chargé d'un coup (même choix que listMyListings, déjà en place).
// - "Modifier" et "Publier une annonce" utilisent le parcours natif PublishStack.
// - "Ajouter un réel" reste désactivé tant que CreateReel ne sait pas encore pré-sélectionner
//   l'annonce source.
// - Catégorie/Type ne sont pas des filtres séparés (la recherche texte couvre déjà ce besoin
//   pour un nombre d'annonces par compte qui reste petit) ; Promue/Non promue et l'État restent.
export default function MyListingsScreen() {
  const queryClient = useQueryClient();
  const uid = getAuth().currentUser?.uid;
  const { data, isLoading } = useQuery({ queryKey: ['my-listings'], queryFn: listMyListings });

  const [scope, setScope] = useState<Scope>('immobilier');
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL');
  const [promotedFilter, setPromotedFilter] = useState<PromotedFilter>('ALL');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = data ?? [];
  const scopeCounts = useMemo(
    () => ({
      immobilier: items.filter((item) => !isMarketplaceItem(item)).length,
      marketplace: items.filter(isMarketplaceItem).length,
    }),
    [items],
  );
  const scopedItems = useMemo(
    () => items.filter((item) => (scope === 'immobilier' ? !isMarketplaceItem(item) : isMarketplaceItem(item))),
    [items, scope],
  );

  const stats = useMemo(
    () => ({
      total: scopedItems.length,
      active: scopedItems.filter((item) => item.state === 'IN_PROGRESS').length,
      archived: scopedItems.filter((item) => item.state === 'ARCHIVED').length,
      promoted: scopedItems.filter((item) => item.isPromoted).length,
    }),
    [scopedItems],
  );

  const hasActiveFilters =
    stateFilter !== 'ALL' || promotedFilter !== 'ALL' || priceMin.trim() !== '' || priceMax.trim() !== '';

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const min = Number(priceMin) > 0 ? Number(priceMin) : undefined;
    const max = Number(priceMax) > 0 ? Number(priceMax) : undefined;

    const filtered = scopedItems.filter((item) => {
      if (query) {
        const haystack = [item.title, item.city, item.province, item.street, item.typeProperty]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (stateFilter !== 'ALL' && item.state !== stateFilter) return false;
      if (promotedFilter === 'PROMOTED' && !item.isPromoted) return false;
      if (promotedFilter === 'NOT_PROMOTED' && item.isPromoted) return false;
      if (min !== undefined && (item.price || 0) < min) return false;
      if (max !== undefined && (item.price || 0) > max) return false;
      return true;
    });

    return sortItems(filtered, sort);
  }, [scopedItems, searchQuery, stateFilter, promotedFilter, priceMin, priceMax, sort]);

  const resetFilters = () => {
    setStateFilter('ALL');
    setPromotedFilter('ALL');
    setPriceMin('');
    setPriceMax('');
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-listings'] });

  // Immobilier ET zone unique/absente : la fiche est visible publiquement (donc affichable
  // nativement via ListingDetailScreen, qui appelle /api/property/id — cette route accepte les
  // annonces PENDING/REJECTED/ARCHIVED uniquement avec une session NextAuth, que le mobile n'a
  // jamais). Pour ses propres annonces non publiques, on ouvre plutôt la fiche web (authentifiée
  // par cookie côté navigateur) plutôt que de dupliquer la logique d'auth côté mobile.
  const handleView = (item: MyListingItem) => {
    const isPubliclyVisible = item.state === 'IN_PROGRESS' && item.moderationStatus === 'APPROVED';
    if (isPubliclyVisible && navigationRef.isReady()) {
      navigationRef.navigate('Main', {
        screen: 'MainTabs',
        params: { screen: 'Recherche', params: { screen: 'ListingDetail', params: { objectID: item.id } } },
      });
      return;
    }
    Linking.openURL(`${WEB_BASE_URL}/property/${item.id}`);
  };

  const handleEdit = (item: MyListingItem) => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', {
      screen: 'MainTabs',
      params: { screen: 'Publier', params: { screen: 'EditListing', params: { listingId: item.id } } },
    });
  };

  const handleAddReel = () => {
    Alert.alert('Bientôt disponible', 'Ajouter un réel depuis une annonce arrive prochainement.');
  };

  const handleToggleState = (item: MyListingItem) => {
    const willArchive = item.state === 'IN_PROGRESS';
    Alert.alert(
      willArchive ? 'Archiver cette annonce ?' : 'Réactiver cette annonce ?',
      willArchive
        ? 'Cette annonce ne sera plus visible dans vos annonces actives.'
        : 'Cette annonce redeviendra visible dans vos annonces actives.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: willArchive ? 'Archiver' : 'Réactiver',
          onPress: async () => {
            setActionError(null);
            setBusyId(item.id);
            try {
              await setListingState(item.id, willArchive ? 'ARCHIVED' : 'IN_PROGRESS');
              await refresh();
              Alert.alert('Annonce mise à jour', willArchive ? 'L’annonce a été archivée.' : 'L’annonce a été réactivée.');
            } catch {
              setActionError("Impossible de mettre à jour l'état de l'annonce.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = (item: MyListingItem) => {
    Alert.alert(
      'Supprimer cette annonce ?',
      'Cette action est définitive. L’annonce sera supprimée de votre compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setActionError(null);
            setBusyId(item.id);
            try {
              await deleteListing(item.id);
              await refresh();
              Alert.alert('Annonce supprimée', 'La suppression a été effectuée avec succès.');
            } catch {
              setActionError("Impossible de supprimer l'annonce.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.scopeRow}>
        <TouchableOpacity
          testID="my-listings-scope-immobilier"
          style={[styles.scopePill, scope === 'immobilier' && styles.scopePillActive]}
          onPress={() => setScope('immobilier')}
        >
          <Building2 size={14} color={scope === 'immobilier' ? '#fff' : colors.foreground} />
          <Text style={[styles.scopePillText, scope === 'immobilier' && styles.scopePillTextActive]}>
            Immobilier ({scopeCounts.immobilier})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="my-listings-scope-marketplace"
          style={[styles.scopePill, scope === 'marketplace' && styles.scopePillActive]}
          onPress={() => setScope('marketplace')}
        >
          <ShoppingBag size={14} color={scope === 'marketplace' ? '#fff' : colors.foreground} />
          <Text style={[styles.scopePillText, scope === 'marketplace' && styles.scopePillTextActive]}>
            Mode ({scopeCounts.marketplace})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        testID="my-listings-stats-strip"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroller}
        contentContainerStyle={styles.statsRowContent}
      >
        <StatCard
          testID="my-listings-stat-total"
          title="Total annonces"
          value={stats.total}
          icon={<Layers3 size={19} color={colors.primary} strokeWidth={2} />}
        />
        <StatCard
          testID="my-listings-stat-active"
          title="Actives"
          value={stats.active}
          icon={<CircleCheck size={19} color={colors.primary} strokeWidth={2} />}
        />
        <StatCard
          testID="my-listings-stat-archived"
          title="Archivées"
          value={stats.archived}
          icon={<Archive size={19} color={colors.primary} strokeWidth={2} />}
        />
        <StatCard
          testID="my-listings-stat-promoted"
          title="Promues"
          value={stats.promoted}
          icon={<TrendingUp size={19} color={colors.primary} strokeWidth={2} />}
        />
      </ScrollView>

      <View style={styles.searchRow}>
        <TextInput
          testID="my-listings-search"
          style={styles.searchInput}
          placeholder="Rechercher une annonce..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          testID="my-listings-filter-button"
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setFiltersVisible(true)}
        >
          <SlidersHorizontal size={18} color={hasActiveFilters ? '#fff' : colors.foreground} />
        </TouchableOpacity>
      </View>

      <Text style={styles.filteredCountText}>
        <Text style={styles.filteredCountStrong}>{filteredItems.length}</Text> annonce(s) affichée(s) sur{' '}
        <Text style={styles.filteredCountStrong}>{scopedItems.length}</Text> au total.
      </Text>

      {actionError && <Text style={styles.errorText}>{actionError}</Text>}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          testID="my-listings-list"
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              isBusy={busyId === item.id}
              onView={handleView}
              onEdit={handleEdit}
              onToggleState={handleToggleState}
              onDelete={handleDelete}
              onAddReel={handleAddReel}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrapper}>
                <Building2 size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucune annonce trouvée</Text>
              <Text style={styles.emptyText}>Ajustez vos filtres ou utilisez le bouton + pour publier.</Text>
            </View>
          }
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyListContent : styles.listContent}
        />
      )}

      {!uid && (
        <View style={styles.sessionBanner}>
          <Text style={styles.sessionBannerText}>Session indisponible. Reconnectez-vous pour gérer vos annonces.</Text>
        </View>
      )}

      <Modal visible={filtersVisible} animationType="slide" onRequestClose={() => setFiltersVisible(false)}>
        <SafeAreaView style={{ flex: 1 }} testID="my-listings-filters-modal">
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity
                testID="my-listings-filter-close"
                onPress={() => setFiltersVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>État</Text>
            <View style={styles.pillsRow}>
              {(
                [
                  { value: 'ALL', label: 'Actives + Archivées' },
                  { value: 'IN_PROGRESS', label: 'Actives' },
                  { value: 'ARCHIVED', label: 'Archivées' },
                ] as { value: StateFilter; label: string }[]
              ).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  testID={`my-listings-filter-state-${option.value}`}
                  style={[styles.pill, stateFilter === option.value && styles.pillActive]}
                  onPress={() => setStateFilter(option.value)}
                >
                  <Text style={[styles.pillText, stateFilter === option.value && styles.pillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Promotion</Text>
            <View style={styles.pillsRow}>
              {(
                [
                  { value: 'ALL', label: 'Avec ou sans promotion' },
                  { value: 'PROMOTED', label: 'Promues uniquement' },
                  { value: 'NOT_PROMOTED', label: 'Non promues' },
                ] as { value: PromotedFilter; label: string }[]
              ).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  testID={`my-listings-filter-promoted-${option.value}`}
                  style={[styles.pill, promotedFilter === option.value && styles.pillActive]}
                  onPress={() => setPromotedFilter(option.value)}
                >
                  <Text style={[styles.pillText, promotedFilter === option.value && styles.pillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Prix minimum (FCFA)</Text>
            <TextInput
              testID="my-listings-filter-price-min"
              style={styles.input}
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="numeric"
              placeholder="Ex: 50000"
            />

            <Text style={styles.label}>Prix maximum (FCFA)</Text>
            <TextInput
              testID="my-listings-filter-price-max"
              style={styles.input}
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="numeric"
              placeholder="Ex: 500000"
            />

            <Text style={styles.label}>Trier par</Text>
            <View style={styles.pillsRow}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  testID={`my-listings-filter-sort-${option.value}`}
                  style={[styles.pill, sort === option.value && styles.pillActive]}
                  onPress={() => setSort(option.value)}
                >
                  <Text style={[styles.pillText, sort === option.value && styles.pillTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity testID="my-listings-filter-reset" style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scopeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scopePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scopePillText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  scopePillTextActive: { color: '#fff' },
  statsScroller: { height: 104, marginTop: 12, flexGrow: 0, flexShrink: 0 },
  statsRowContent: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  statCard: {
    width: 156,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#fff',
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5F3',
  },
  statValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.foreground,
    fontVariant: ['tabular-nums'],
  },
  statTitle: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '500', color: colors.mutedText },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filteredCountText: { fontSize: 12, color: colors.mutedText, paddingHorizontal: 16, marginTop: 10 },
  filteredCountStrong: { fontWeight: '700', color: colors.foreground },
  errorText: { color: colors.destructive, fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 14 },
  emptyListContent: { flexGrow: 1, paddingBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  imageWrapper: { width: '100%', height: 180, backgroundColor: '#F3F4F6' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: '#F3F4F6' },
  badgeRow: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badgeWhite: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeWhiteText: { fontSize: 11, fontWeight: '700', color: colors.foreground },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSuccess: { backgroundColor: 'rgba(16,185,129,0.9)' },
  badgeWarning: { backgroundColor: 'rgba(245,158,11,0.9)' },
  badgeDestructive: { backgroundColor: 'rgba(239,68,68,0.9)' },
  badgeAccent: { backgroundColor: 'rgba(20,107,103,0.92)' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardBody: { padding: 14, gap: 6 },
  title: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedText },
  rejectionBox: { backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  rejectionText: { fontSize: 12, color: '#B91C1C' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { flex: 1, fontSize: 13, color: colors.foreground },
  priceBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginTop: 4, gap: 4 },
  price: { fontSize: 17, fontWeight: '800', color: colors.primary },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, color: colors.mutedText },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  actionButton: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
  },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  reelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    marginTop: 8,
  },
  emptyCard: {
    margin: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  emptyText: { fontSize: 13, color: colors.mutedText, textAlign: 'center' },
  sessionBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  sessionBannerText: { fontSize: 12, color: '#92400E' },
  modalContent: { padding: 20, gap: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 15 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: colors.foreground },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  resetButton: { alignItems: 'center', padding: 12, marginTop: 20 },
  resetButtonText: { color: colors.mutedText, fontSize: 14 },
});
