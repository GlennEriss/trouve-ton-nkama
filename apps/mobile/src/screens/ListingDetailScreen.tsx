import React from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Heart, MapPin, Phone, Tag, X } from 'lucide-react-native';
import { getPropertyById, type PropertyDetail } from '../api/property';
import { getOwnedListing, moderationLabel, type MyListingItem } from '../api/myListings';
import { getPublicUserSummary } from '../api/users';
import { toGabonWhatsappE164, toWaMeDigits } from '../lib/phone';
import { getImageUrl, type PropertyImage } from '../lib/propertyImage';
import { useFavoriteIds, addFavorite, removeFavorite } from '../hooks/useFavoriteIds';
import { requireAuthOrRedirect } from '../lib/authGuard';
import { formatListingZones } from '../lib/listingZones';
import { getUserDisplayInitial, getUserDisplayName, generateColorFromName } from '../lib/userDisplay';
import { colors } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
type DetailRoute = RouteProp<{ ListingDetail: { objectID: string; ownerView?: boolean } }, 'ListingDetail'>;
type Listing = PropertyDetail & Partial<MyListingItem>;
const PROPERTY_LABELS: Record<string, string> = { Home: 'Maison', Apartment: 'Appartement', Studio: 'Studio', Room: 'Chambre', Villa: 'Villa', Duplex: 'Duplex', Building: 'Immeuble', Desk: 'Bureau', Shop: 'Boutique', Kiosk: 'Kiosque', Warehouse: 'Entrepôt', Land: 'Terrain' };

function ImageGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [fullscreen, setFullscreen] = React.useState(false);
  const urls = images.map((image) => getImageUrl(image)).filter((url): url is string => Boolean(url));
  if (!urls.length) return <View testID="listing-gallery-empty" style={[styles.image, styles.imagePlaceholder]}><Text style={styles.placeholderText}>Aucune photo</Text></View>;
  const gallery = (full = false) => <FlatList testID={full ? 'listing-gallery-fullscreen' : 'listing-gallery'} data={urls} keyExtractor={(url, index) => `${url}-${index}`} horizontal pagingEnabled initialScrollIndex={activeIndex} getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH))} renderItem={({ item, index }) => <Pressable accessibilityLabel={`Agrandir la photo ${index + 1} de ${title}`} onPress={() => !full && setFullscreen(true)}><Image source={{ uri: item }} resizeMode={full ? 'contain' : 'cover'} style={[full ? styles.fullImage : styles.image, { width: SCREEN_WIDTH }]} /></Pressable>} />;
  return <View>{gallery()}<View style={styles.counter}><Text style={styles.counterText}>{activeIndex + 1} / {urls.length}</Text></View><Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}><View style={styles.fullscreen}><Pressable accessibilityLabel="Fermer la galerie" onPress={() => setFullscreen(false)} style={styles.fullClose}><X size={25} color="#fff" /></Pressable>{gallery(true)}<Text style={styles.fullCounter}>{activeIndex + 1} / {urls.length}</Text></View></Modal></View>;
}

function formatPrice(price?: number) { return price ? `${price.toLocaleString('fr-FR')} FCFA` : 'Prix non renseigné'; }
function valueLabel(value: unknown) { return typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value); }
function buildAttributes(property: Listing): Array<[string, unknown]> {
  const raw: Array<[string, unknown]> = property.typeProperty ? [
    ['Type de bien', PROPERTY_LABELS[property.typeProperty] ?? property.typeProperty], ['Superficie', property.area ? `${property.area} m²` : undefined],
    ['Chambres', property.nbrRooms], ['Cuisines', property.nbrKitchens], ['Salles de bain', property.nbrBathrooms], ['Toilettes', property.nbrToilets ?? property.nbrToilet],
    ['Étages', property.nbrFloors ?? property.nbrFloorApartment ?? property.nbrFloorStudio], ['Garages', property.nbrGarages], ['Salons', property.nbrLivingRoom],
    ['Piscine', property.nbrPiscine], ['Appartements', property.nbrApartments], ['Parking', property.hasParking], ['Sections', property.nbrSections],
    ['Type de kiosque', property.kioskType], ['Type de chambre', property.roomType],
  ] : Object.entries(property.attributes ?? {});
  return raw.filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 0);
}

function SellerSection({ uid }: { uid?: string }) {
  const seller = useQuery({ queryKey: ['listing-owner', uid], queryFn: () => getPublicUserSummary(uid!), enabled: Boolean(uid), staleTime: 600_000 });
  if (!uid || seller.isLoading) return null;
  const name = getUserDisplayName(seller.data) ?? 'Annonceur Trouve Ton Nkama';
  return <View style={styles.section}>
    <Text style={styles.sectionTitle}>Annonceur</Text>
    <View style={styles.sellerRow}>
      {seller.data?.image ? <Image source={{ uri: seller.data.image }} style={styles.sellerAvatar} /> : <View style={[styles.sellerAvatar, styles.sellerInitial, { backgroundColor: generateColorFromName(name) }]}><Text style={styles.sellerInitialText}>{getUserDisplayInitial(seller.data) || 'T'}</Text></View>}
      <View style={{ flex: 1 }}><Text style={styles.sellerName}>{name}</Text><Text style={styles.sellerCaption}>Annonceur sur Trouve Ton Nkama</Text></View>
    </View>
  </View>;
}

export default function ListingDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { objectID, ownerView = false } = route.params;
  const query = useQuery({ queryKey: [ownerView ? 'my-listing-detail' : 'property', objectID], queryFn: async () => (ownerView ? getOwnedListing(objectID) : getPropertyById(objectID)) as Promise<Listing> });
  const { favoriteIds } = useFavoriteIds();
  const isFavorite = favoriteIds.includes(objectID);
  if (query.isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>Chargement de l’annonce…</Text></View>;
  if (query.isError || !query.data) return <View style={styles.centered}><AlertTriangle size={34} color={colors.destructive} /><Text accessibilityRole="alert" style={styles.errorTitle}>Annonce inaccessible</Text><Text style={styles.emptyText}>{query.error instanceof Error ? query.error.message : "Cette annonce n’est plus disponible."}</Text><TouchableOpacity onPress={() => query.refetch()} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity></View>;

  const property = query.data;
  const whatsappNumber = property.whatsappContact || property.contact;
  const callNumber = property.callContact || property.contact;
  const contacts = [{ whatsapp: whatsappNumber, call: callNumber, label: 'Contact principal' }, ...(property.additionalContacts ?? []).map((number, index) => ({ whatsapp: number, call: number, label: `Contact ${index + 2}` }))].filter((entry) => entry.whatsapp || entry.call);
  const attributes = buildAttributes(property);
  const category = property.typeProperty ? PROPERTY_LABELS[property.typeProperty] ?? property.typeProperty : property.categoryPath?.lvl1?.split(' > ').pop() ?? property.categoryPath?.lvl0 ?? 'Mode';
  const location = property.cities && property.cities.length > 1 ? formatListingZones(property) : [property.street, property.city, property.province].filter(Boolean).join(', ');
  const openWhatsApp = (number: string) => { const message = `Bonjour, je suis intéressé(e) par votre annonce "${property.title}" au prix de ${formatPrice(property.price)}. Voici le lien : https://www.tonnkama.com/annonce/${property.id}`; void Linking.openURL(`https://wa.me/${toWaMeDigits(number)}?text=${encodeURIComponent(message)}`); };

  return <ScrollView testID={ownerView ? 'owner-listing-detail' : 'public-listing-detail'} style={styles.container} contentContainerStyle={styles.scrollContent}>
    <ImageGallery images={property.images ?? []} title={property.title} />
    <View style={styles.content}>
      <View style={styles.chips}><View style={styles.chip}><Tag size={13} color={colors.primary} /><Text style={styles.chipText}>{category}</Text></View>{property.typeProperty && property.status ? <View style={styles.chip}><Text style={styles.chipText}>{property.status === 'FOR_RENT' ? 'À louer' : 'À vendre'}</Text></View> : null}{ownerView && property.state ? <View style={[styles.chip, property.state === 'ARCHIVED' && styles.warningChip]}><Text style={styles.chipText}>{property.state === 'ARCHIVED' ? 'Archivée' : 'Active'}</Text></View> : null}{ownerView && property.moderationStatus ? <View style={styles.chip}><Text style={styles.chipText}>{moderationLabel(property.moderationStatus)}</Text></View> : null}</View>
      {ownerView && property.moderationStatus === 'REJECTED' && property.rejectionReason ? <View style={styles.rejection}><AlertTriangle size={18} color={colors.destructive} /><Text style={styles.rejectionText}>Motif du rejet : {property.rejectionReason}</Text></View> : null}
      {property.state === 'ARCHIVED' ? <View style={styles.archived}><AlertTriangle size={18} color="#B45309" /><View style={{ flex: 1 }}><Text style={styles.archivedTitle}>Annonce non disponible</Text><Text style={styles.archivedText}>Cette annonce est actuellement archivée.</Text></View></View> : null}
      <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={styles.title}>{property.title}</Text><Text style={styles.price}>{formatPrice(property.price)}{property.status === 'FOR_RENT' ? ' / mois' : ''}</Text></View>{!ownerView ? <TouchableOpacity hitSlop={10} onPress={() => { if (!requireAuthOrRedirect()) return; void (isFavorite ? removeFavorite(objectID) : addFavorite(objectID)); }} accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}><Heart size={26} color={colors.destructive} fill={isFavorite ? colors.destructive : 'transparent'} /></TouchableOpacity> : null}</View>
      {location ? <View style={styles.locationRow}><MapPin size={18} color={colors.primary} /><Text style={styles.location}>{location}</Text></View> : null}
      <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.description}>{property.description || "L’annonceur n’a pas ajouté de description."}</Text></View>
      {attributes.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Caractéristiques</Text><View style={styles.attributeGrid}>{attributes.map(([label, value]) => <View key={label} style={styles.attribute}><Text style={styles.attributeLabel}>{label}</Text><Text style={styles.attributeValue}>{valueLabel(value)}</Text></View>)}</View></View> : null}
      {property.additionnalInformation ? <View style={styles.section}><Text style={styles.sectionTitle}>Localisation</Text><Text style={styles.description}>{property.additionnalInformation}</Text></View> : null}
      <SellerSection uid={property.claimedBy ?? property.createdBy} />
      {contacts.length ? <View style={styles.section}><Text style={styles.sectionTitle}>Contacter l’annonceur</Text>{contacts.map((entry) => <View key={entry.label} style={styles.contactBlock}><Text style={styles.contactLabel}>{entry.label}</Text><View style={styles.contactRow}>{entry.whatsapp ? <TouchableOpacity testID={`listing-whatsapp-${entry.label}`} style={styles.whatsappButton} onPress={() => openWhatsApp(entry.whatsapp!)}><Text style={styles.contactButtonText}>WhatsApp</Text></TouchableOpacity> : null}{entry.call ? <TouchableOpacity testID={`listing-call-${entry.label}`} style={styles.callButton} onPress={() => void Linking.openURL(`tel:${toGabonWhatsappE164(entry.call!)}`)}><Phone size={17} color="#fff" /><Text style={styles.contactButtonText}>Appeler</Text></TouchableOpacity> : null}</View></View>)}</View> : null}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, scrollContent: { paddingBottom: 30 }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 }, loadingText: { color: colors.mutedText, fontSize: 14 }, errorTitle: { color: colors.foreground, fontSize: 20, fontWeight: '800' }, emptyText: { color: colors.mutedText, fontSize: 14, textAlign: 'center' }, retry: { minHeight: 46, marginTop: 8, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 23, backgroundColor: colors.primary }, retryText: { color: '#fff', fontWeight: '700' },
  image: { height: 330, backgroundColor: '#E5E7EB' }, imagePlaceholder: { alignItems: 'center', justifyContent: 'center' }, placeholderText: { color: colors.mutedText }, counter: { position: 'absolute', right: 14, bottom: 14, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,.65)' }, counterText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }, fullscreen: { flex: 1, justifyContent: 'center', backgroundColor: '#000' }, fullImage: { height: '100%' }, fullClose: { position: 'absolute', zIndex: 2, top: 52, right: 16, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.16)' }, fullCounter: { position: 'absolute', bottom: 44, alignSelf: 'center', color: '#fff', fontSize: 14, fontWeight: '700' },
  content: { padding: 16, gap: 18 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, paddingHorizontal: 11, backgroundColor: '#E8F5F3' }, warningChip: { backgroundColor: '#FEF3C7' }, chipText: { color: '#155E59', fontSize: 12, fontWeight: '700' }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, title: { color: colors.foreground, fontSize: 23, lineHeight: 30, fontWeight: '800' }, price: { marginTop: 4, color: colors.primary, fontSize: 22, fontWeight: '800' }, locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, location: { flex: 1, color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  rejection: { flexDirection: 'row', gap: 9, borderWidth: 1, borderColor: '#FECACA', borderRadius: 14, padding: 13, backgroundColor: '#FEF2F2' }, rejectionText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 19 }, archived: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 13, backgroundColor: '#FFFBEB' }, archivedTitle: { color: '#92400E', fontWeight: '800' }, archivedText: { marginTop: 2, color: '#B45309', fontSize: 13 },
  section: { gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 18, padding: 16, backgroundColor: '#fff' }, sectionTitle: { color: colors.foreground, fontSize: 17, fontWeight: '800' }, description: { color: '#374151', fontSize: 15, lineHeight: 23 }, attributeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, attribute: { width: '48%', minHeight: 68, justifyContent: 'center', borderRadius: 13, padding: 11, backgroundColor: '#F3F4F6' }, attributeLabel: { color: colors.mutedText, fontSize: 11, textTransform: 'capitalize' }, attributeValue: { marginTop: 3, color: colors.foreground, fontSize: 14, fontWeight: '700' }, contactBlock: { gap: 7 }, contactLabel: { color: colors.mutedText, fontSize: 12, fontWeight: '600' }, contactRow: { flexDirection: 'row', gap: 10 }, whatsappButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#16A34A' }, callButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 24, backgroundColor: colors.primary }, contactButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sellerAvatar: { width: 48, height: 48, borderRadius: 24 }, sellerInitial: { alignItems: 'center', justifyContent: 'center' }, sellerInitialText: { color: '#134E4A', fontSize: 18, fontWeight: '800' }, sellerName: { color: colors.foreground, fontSize: 15, fontWeight: '800' }, sellerCaption: { marginTop: 2, color: colors.mutedText, fontSize: 12 },
});
