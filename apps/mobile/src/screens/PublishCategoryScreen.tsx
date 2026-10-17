import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Building2, Shirt, Tag } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getActiveCategories } from '../api/categories';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PublishStackParamList, 'PublishCategory'>;

function CategoryIcon({ slug }: { slug: string }) {
  const Icon = slug === 'immobilier' ? Building2 : slug === 'mode' ? Shirt : Tag;
  return <Icon color={colors.success} size={40} strokeWidth={2} />;
}

export default function PublishCategoryScreen({ navigation }: Props) {
  const query = useQuery({
    queryKey: ['categories', 'active-roots'],
    queryFn: getActiveCategories,
    staleTime: 10 * 60 * 1000,
  });
  const categories = useMemo(() => query.data ?? [], [query.data]);

  useEffect(() => {
    if (categories.length === 1) {
      const category = categories[0];
      navigation.replace('CreateListing', { categorySlug: category.slug, categoryName: category.name });
    }
  }, [categories, navigation]);

  if (query.isLoading || categories.length === 1) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} testID="screen-publish-category">
      <Text style={styles.title}>Que veux-tu publier ?</Text>
      <Text style={styles.subtitle}>Choisis une catégorie</Text>

      {query.isError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Impossible de charger les catégories.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => query.refetch()} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cards}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              testID={`publish-category-${category.slug}`}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              activeOpacity={0.72}
              style={styles.card}
              onPress={() => navigation.navigate('CreateListing', { categorySlug: category.slug, categoryName: category.name })}
            >
              <CategoryIcon slug={category.slug} />
              <Text style={styles.cardTitle}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.foreground },
  subtitle: { marginTop: 4, marginBottom: 24, fontSize: 14, lineHeight: 20, color: colors.mutedText },
  cards: { gap: 16 },
  card: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  errorBox: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  errorText: { color: colors.destructive, fontSize: 14 },
  retryButton: { minHeight: 48, justifyContent: 'center', borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '700' },
});
