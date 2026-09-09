import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import type { PropertyListItem } from '../api/property';
import { useFavoriteIds, addFavorite, removeFavorite } from '../hooks/useFavoriteIds';
import { requireAuthOrRedirect } from '../lib/authGuard';
import { getImageUrl } from '../lib/propertyImage';
import { colors } from '../theme/colors';

function formatPrice(price?: number): string {
  if (!price) return '';
  return `${price.toLocaleString('fr-FR')} FCFA`;
}

// Carte "carousel" inspirée de la maquette (image pleine largeur, badge prix superposé, coeur
// favoris superposé, nom + localisation dessous) — mêmes données/mêmes favoris que le reste de
// l'app (useFavoriteIds, déjà utilisé par ListingDetailScreen), pas de note étoilée (n'existe
// pas côté produit) ni de prix en $ (toujours FCFA).
export function PropertyCard({ property, onPress, width = 200 }: { property: PropertyListItem; onPress: () => void; width?: number }) {
  const { favoriteIds } = useFavoriteIds();
  const isFavorite = favoriteIds.includes(property.id);
  const thumbnailUrl = getImageUrl(property.images?.[0], true);

  const toggleFavorite = () => {
    if (!requireAuthOrRedirect()) return;
    if (isFavorite) removeFavorite(property.id);
    else addFavorite(property.id);
  };

  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrapper}>
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText} numberOfLines={1}>
            {formatPrice(property.price)}
            {property.status === 'FOR_RENT' ? '/mois' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heartButton}
          onPress={toggleFavorite}
          accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart size={16} color={colors.destructive} fill={isFavorite ? colors.destructive : 'transparent'} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
      <Text style={styles.location} numberOfLines={1}>{[property.city, property.province].filter(Boolean).join(', ')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  imageWrapper: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  image: { width: '100%', height: 130 },
  imagePlaceholder: { backgroundColor: '#F3F4F6' },
  priceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 4 },
  location: { fontSize: 11, color: colors.mutedText },
});
