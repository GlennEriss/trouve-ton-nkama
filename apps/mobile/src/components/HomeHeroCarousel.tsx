import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Image, Linking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { getActiveHomeAds, trackAdEvent, type AdCreative } from '../api/advertising';
import { colors } from '../theme/colors';
import { Logo } from './Logo';

const SLIDE_DURATION_MS = 7000;
const CARD_MARGIN = 16;
const HERO_ASPECT_RATIO = 3;
type Slide = { kind: 'platform' } | { kind: 'sponsored'; creative: AdCreative };

const PlatformSlide = memo(function PlatformSlide({ height }: { height: number }) {
  return <LinearGradient colors={[colors.secondary, colors.primary]} style={[styles.card, { height }]} testID="home-hero-platform-slide">
    <View style={styles.platformContent}>
      <Text style={styles.platformKicker}>La référence immobilière au Gabon</Text>
      <Text style={styles.platformTitle}>Trouvez le logement idéal ou développez votre activité immobilière</Text>
      <Text style={styles.platformSubtitle}>La plateforme digitale de l&apos;immobilier au Gabon</Text>
    </View>
    <View style={styles.platformLogo}><Logo size={48} /></View>
  </LinearGradient>;
});

const SponsoredSlide = memo(function SponsoredSlide({ creative, height }: { creative: AdCreative; height: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [creative.imageURL]);
  const onPress = () => {
    trackAdEvent('click', creative.campaignId, 'home-hero');
    if (creative.ctaUrl) Linking.openURL(creative.ctaUrl).catch(() => {});
  };
  const hasImage = Boolean(creative.imageURL) && !imageFailed;
  return <TouchableOpacity
    activeOpacity={creative.ctaUrl ? 0.92 : 1}
    disabled={!creative.ctaUrl}
    onPress={onPress}
    style={[styles.card, styles.sponsoredCard, { height }]}
    accessibilityRole={creative.ctaUrl ? 'link' : 'image'}
    accessibilityLabel={creative.headline ? `Publicité sponsorisée : ${creative.headline}` : 'Publicité sponsorisée'}
    accessibilityHint={creative.ctaUrl ? 'Ouvre le lien de cette publicité' : undefined}
    testID={`home-hero-sponsored-${creative.campaignId}`}
  >
    {hasImage ? <>
      <Image source={{ uri: creative.imageURL }} style={styles.sponsoredBackdrop} resizeMode="cover" blurRadius={18} accessibilityElementsHidden />
      <View style={styles.backdropScrim} />
      <Image source={{ uri: creative.imageURL }} style={styles.sponsoredImage} resizeMode="contain" onError={() => setImageFailed(true)} accessibilityIgnoresInvertColors testID="home-hero-sponsored-image" />
    </> : <View style={[styles.sponsoredImage, styles.sponsoredPlaceholder]} testID="home-hero-sponsored-fallback"><Text style={styles.sponsoredPlaceholderText}>Visuel de la publicité indisponible</Text></View>}
    <View style={styles.sponsoredBadge}><Text style={styles.sponsoredBadgeText}>Sponsorisé</Text></View>
  </TouchableOpacity>;
});

export function HomeHeroCarousel() {
  const { width: viewportWidth } = useWindowDimensions();
  const cardHeight = Math.round((viewportWidth - CARD_MARGIN * 2) / HERO_ASPECT_RATIO);
  const { data: creatives = [] } = useQuery({ queryKey: ['home-hero-ads'], queryFn: getActiveHomeAds, staleTime: 5 * 60 * 1000 });
  const slides = useMemo<Slide[]>(() => [{ kind: 'platform' }, ...creatives.map((creative) => ({ kind: 'sponsored' as const, creative }))], [creatives]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const listRef = useRef<FlatList<Slide>>(null);
  const impressionsSent = useRef<Set<string>>(new Set());

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (slides.length <= 1 || reduceMotion || isInteracting) return;
    const interval = setInterval(() => setActiveIndex((current) => {
      const next = (current + 1) % slides.length;
      listRef.current?.scrollToOffset({ offset: next * viewportWidth, animated: true });
      return next;
    }), SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [isInteracting, reduceMotion, slides.length, viewportWidth]);
  useEffect(() => { if (activeIndex >= slides.length) setActiveIndex(0); }, [activeIndex, slides.length]);
  useEffect(() => {
    const active = slides[activeIndex];
    if (active?.kind === 'sponsored' && !impressionsSent.current.has(active.creative.campaignId)) {
      impressionsSent.current.add(active.creative.campaignId);
      trackAdEvent('impression', active.creative.campaignId, 'home-hero');
    }
  }, [activeIndex, slides]);
  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.max(0, Math.min(slides.length - 1, Math.round(event.nativeEvent.contentOffset.x / viewportWidth))));
    setIsInteracting(false);
  };

  return <View style={styles.container}>
    <FlatList
      ref={listRef} data={slides}
      keyExtractor={(item, index) => item.kind === 'sponsored' ? item.creative.campaignId : `platform-${index}`}
      renderItem={({ item }) => <View style={{ width: viewportWidth }}>{item.kind === 'sponsored' ? <SponsoredSlide creative={item.creative} height={cardHeight} /> : <PlatformSlide height={cardHeight} />}</View>}
      horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      onScrollBeginDrag={() => setIsInteracting(true)} onMomentumScrollEnd={onMomentumScrollEnd}
      getItemLayout={(_, index) => ({ length: viewportWidth, offset: viewportWidth * index, index })}
      initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews
      accessibilityRole="adjustable" accessibilityLabel="Carousel publicitaire de l’accueil"
      accessibilityValue={{ min: 1, max: slides.length, now: activeIndex + 1, text: `${activeIndex + 1} sur ${slides.length}` }}
      testID="home-hero-carousel"
    />
    {slides.length > 1 ? <View style={styles.positionPill} pointerEvents="none" testID="home-hero-position-indicator"><Text style={styles.positionText}>{activeIndex + 1} / {slides.length}</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 0, position: 'relative' },
  card: { marginHorizontal: CARD_MARGIN, borderRadius: 16, overflow: 'hidden' },
  platformContent: { flex: 1, maxWidth: '82%', paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', gap: 3 },
  platformKicker: { color: '#fff', fontSize: 10, fontWeight: '700', opacity: 0.9 },
  platformTitle: { color: '#fff', fontSize: 15, fontWeight: '800', lineHeight: 18 },
  platformSubtitle: { color: '#fff', fontSize: 10, opacity: 0.86, lineHeight: 13 },
  platformLogo: { position: 'absolute', right: 12, bottom: 10, opacity: 0.9 },
  sponsoredCard: { backgroundColor: '#E8EFEE' },
  sponsoredBackdrop: { position: 'absolute', inset: 0, opacity: 0.42 },
  backdropScrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(3, 35, 32, 0.18)' },
  sponsoredImage: { width: '100%', height: '100%' },
  sponsoredPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  sponsoredPlaceholderText: { color: colors.mutedText, fontSize: 12 },
  sponsoredBadge: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(3, 35, 32, 0.82)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  sponsoredBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  positionPill: { position: 'absolute', right: CARD_MARGIN + 10, bottom: 10, minWidth: 43, height: 26, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3, 35, 32, 0.76)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.35)' },
  positionText: { color: '#fff', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
