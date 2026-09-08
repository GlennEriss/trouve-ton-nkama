import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react-native';
import { getPropertyById } from '../api/property';
import { toGabonWhatsappE164, toWaMeDigits } from '../lib/phone';
import { getImageUrl, type PropertyImage } from '../lib/propertyImage';
import { useFavoriteIds, addFavorite, removeFavorite } from '../hooks/useFavoriteIds';
import { requireAuthOrRedirect } from '../lib/authGuard';
import { colors } from '../theme/colors';
import type { SearchStackParamList } from '../navigation/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

function ImageGallery({ images }: { images: PropertyImage[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const urls = images.map((img) => getImageUrl(img)).filter((url): url is string => Boolean(url));

  if (urls.length === 0) {
    return <View style={[styles.image, styles.imagePlaceholder]} />;
  }

  return (
    <View>
      <FlatList
        data={urls}
        keyExtractor={(url, index) => `${url}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
        renderItem={({ item }) => <Image source={{ uri: item }} style={[styles.image, { width: SCREEN_WIDTH }]} />}
      />
      {urls.length > 1 && (
        <View style={styles.dotsRow}>
          {urls.map((url, index) => (
            <View key={url} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

export default function ListingDetailScreen() {
  const route = useRoute<RouteProp<SearchStackParamList, 'ListingDetail'>>();
  const { objectID } = route.params;

  const { data: property, isLoading, isError } = useQuery({
    queryKey: ['property', objectID],
    queryFn: () => getPropertyById(objectID),
  });
  const { favoriteIds } = useFavoriteIds();
  const isFavorite = favoriteIds.includes(objectID);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#146B67" />
      </View>
    );
  }

  if (isError || !property) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Cette annonce n&apos;est plus disponible.</Text>
      </View>
    );
  }

  // Même repli que ContactSection.tsx côté web : whatsappContact/callContact retombent sur
  // `contact` s'ils sont absents. Le repli supplémentaire sur le téléphone du propriétaire
  // (lookup séparé côté web) est omis en V1 — simplification volontaire, la grande majorité
  // des annonces ont déjà un de ces champs renseigné.
  const whatsappNumber = property.whatsappContact || property.contact;
  const callNumber = property.callContact || property.contact;

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const message = `Bonjour, je suis intéressé(e) par votre annonce "${property.title}" sur Trouve Ton Nkama.`;
    Linking.openURL(`https://wa.me/${toWaMeDigits(whatsappNumber)}?text=${encodeURIComponent(message)}`);
  };

  const openCall = () => {
    if (!callNumber) return;
    Linking.openURL(`tel:${toGabonWhatsappE164(callNumber)}`);
  };

  return (
    <ScrollView style={styles.container}>
      <ImageGallery images={property.images ?? []} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, styles.titleFlex]}>{property.title}</Text>
          <TouchableOpacity
            onPress={() => {
              if (!requireAuthOrRedirect()) return;
              if (isFavorite) removeFavorite(objectID);
              else addFavorite(objectID);
            }}
            accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart size={24} color={colors.destructive} fill={isFavorite ? colors.destructive : 'transparent'} />
          </TouchableOpacity>
        </View>
        <Text style={styles.location}>{[property.street, property.city, property.province].filter(Boolean).join(', ')}</Text>
        <Text style={styles.price}>
          {formatPrice(property.price)}
          {property.status === 'FOR_RENT' ? ' / mois' : ''}
        </Text>

        <View style={styles.statsRow}>
          {property.area ? <Text style={styles.stat}>{property.area} m²</Text> : null}
          {property.nbrRooms ? <Text style={styles.stat}>{property.nbrRooms} pièce(s)</Text> : null}
          {property.nbrBathrooms ? <Text style={styles.stat}>{property.nbrBathrooms} salle(s) de bain</Text> : null}
        </View>

        <Text style={styles.description}>{property.description}</Text>
      </View>

      <View style={styles.contactRow}>
        {whatsappNumber && (
          <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
            <Text style={styles.contactButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        {callNumber && (
          <TouchableOpacity style={styles.callButton} onPress={openCall}>
            <Text style={styles.contactButtonText}>Appeler</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 14 },
  image: { width: '100%', height: 260, backgroundColor: '#f0f0f0' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { backgroundColor: '#fff', width: 9, height: 9, borderRadius: 5 },
  content: { padding: 16, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleFlex: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  location: { fontSize: 14, color: colors.mutedText },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  stat: { fontSize: 13, color: '#444' },
  description: { fontSize: 14, lineHeight: 20, color: '#333', marginTop: 12 },
  contactRow: { flexDirection: 'row', gap: 12, padding: 16 },
  whatsappButton: { flex: 1, backgroundColor: '#16a34a', borderRadius: 999, padding: 14, alignItems: 'center' },
  callButton: { flex: 1, backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center' },
  contactButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
