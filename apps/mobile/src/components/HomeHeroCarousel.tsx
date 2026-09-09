import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Linking, StyleSheet, Text, TouchableOpacity, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { getActiveHomeAds, trackAdEvent, type AdCreative } from '../api/advertising';
import { colors } from '../theme/colors';
import { Logo } from './Logo';

// Port du hero carousel desktop (HomeHeroSponsoredSwap.tsx, web) vers mobile — n'existait
// jusqu'ici QUE sur desktop, le mobile web se contente d'un SponsoredSlot plus discret plus bas
// dans la page. Demande explicite : reproduire ce carousel juste après la navbar sur l'accueil
// mobile app, avec le même mécanisme (slide plateforme + slides sponsorisées en rotation), pas
// un système de pub inventé — même API/donnée que le web (`/api/advertising/active`).
const SLIDE_DURATION_MS = 7000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = 180;

type Slide = { kind: 'platform' } | { kind: 'sponsored'; creative: AdCreative };

function PlatformSlide() {
  return (
    <LinearGradient colors={[colors.secondary, colors.primary]} style={styles.card}>
      <View style={styles.platformContent}>
        <Text style={styles.platformKicker}>La référence immobilière au Gabon</Text>
        <Text style={styles.platformTitle}>Trouvez le logement idéal ou développez votre activité immobilière</Text>
        <Text style={styles.platformSubtitle}>La première plateforme digitale qui révolutionne l&apos;immobilier au Gabon</Text>
      </View>
      <View style={styles.platformLogo}>
        <Logo size={64} />
      </View>
    </LinearGradient>
  );
}

function SponsoredSlide({ creative }: { creative: AdCreative }) {
  const onPress = () => {
    trackAdEvent('click', creative.campaignId, 'home-hero');
    if (creative.ctaUrl) Linking.openURL(creative.ctaUrl).catch(() => {});
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {creative.imageURL ? (
        <Image source={{ uri: creative.imageURL }} style={styles.sponsoredImage} resizeMode="cover" />
      ) : (
        <View style={[styles.sponsoredImage, styles.sponsoredPlaceholder]}>
          <Text style={styles.sponsoredPlaceholderText}>Visuel de la publicité</Text>
        </View>
      )}
      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredBadgeText}>Sponsorisé</Text>
      </View>
    </TouchableOpacity>
  );
}

export function HomeHeroCarousel() {
  const { data: creatives = [] } = useQuery({
    queryKey: ['home-hero-ads'],
    queryFn: getActiveHomeAds,
    staleTime: 5 * 60 * 1000,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const impressionsSent = useRef<Set<string>>(new Set());

  const slides: Slide[] = [{ kind: 'platform' }, ...creatives.map((creative) => ({ kind: 'sponsored' as const, creative }))];

  // La rotation ne démarre que s'il existe au moins une pub à montrer, comme sur le desktop.
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % slides.length;
        listRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const active = slides[activeIndex];
    if (active?.kind === 'sponsored' && !impressionsSent.current.has(active.creative.campaignId)) {
      impressionsSent.current.add(active.creative.campaignId);
      trackAdEvent('impression', active.creative.campaignId, 'home-hero');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, creatives]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item, index) => (item.kind === 'sponsored' ? item.creative.campaignId : `platform-${index}`)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>{item.kind === 'sponsored' ? <SponsoredSlide creative={item.creative} /> : <PlatformSlide />}</View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        testID="home-hero-carousel"
      />
      {slides.length > 1 && (
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const CARD_MARGIN = 16;

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 8 },
  card: {
    marginHorizontal: CARD_MARGIN,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
  },
  platformContent: { flex: 1, padding: 20, justifyContent: 'center', gap: 6 },
  platformKicker: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.9 },
  platformTitle: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 23 },
  platformSubtitle: { color: '#fff', fontSize: 12, opacity: 0.85, lineHeight: 16 },
  platformLogo: { position: 'absolute', right: 16, bottom: 16, opacity: 0.9 },
  sponsoredImage: { width: '100%', height: '100%' },
  sponsoredPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  sponsoredPlaceholderText: { color: colors.mutedText, fontSize: 12 },
  sponsoredBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sponsoredBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});
