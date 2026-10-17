import React from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, Linking, Pressable, Share, StyleSheet, Text, View, type ListRenderItemInfo, type ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Gift, Heart, MessageCircle, Pause, PhoneCall, Play, PlusCircle, RefreshCw, Share2, Video, Volume2, VolumeX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getActiveCategories } from '../api/categories';
import { API_BASE_URL } from '../api/client';
import { getPropertyById } from '../api/property';
import { listPublicReels, trackReelLike, trackReelShare, trackReelView, type PublicReel } from '../api/reels';
import type { MainTabParamList } from '../navigation/types';

const PREFETCH_THRESHOLD = 3;
const likedReelIds = new Set<string>();
type Owner = { firstname?: string; lastname?: string; pseudo?: string; image?: string; phoneNumbers?: string[] };
type FeedItem = { kind: 'reel'; id: string; reel: PublicReel } | { kind: 'end'; id: 'end' };

async function getOwner(uid: string): Promise<Owner | null> {
  const snapshot = await getDoc(doc(getFirestore(), 'users', uid));
  return snapshot.exists() ? (snapshot.data() as Owner) : null;
}
const formatPrice = (price: number) => `${new Intl.NumberFormat('fr-FR').format(price)} FCFA`;

type ReelActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  count?: number;
  active?: boolean;
  children: React.ReactNode;
};

function ReelActionButton({ label, onPress, disabled, count, active, children }: ReelActionButtonProps) {
  return <View style={styles.actionSlot}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: active }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={[styles.actionSurface, active && styles.actionSurfaceActive]}>{children}</View>
    </Pressable>
    {typeof count === 'number' ? <Text style={styles.count}>{new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(count)}</Text> : null}
  </View>;
}

function ReelActionRail({ ownerImage, liked, likes, phone, muted, compact, onLike, onWhatsApp, onCall, onGift, onShare, onToggleMute }: {
  ownerImage?: string; liked: boolean; likes: number; phone?: string; muted: boolean; compact: boolean;
  onLike: () => void; onWhatsApp: () => void; onCall: () => void; onGift: () => void; onShare: () => void; onToggleMute: () => void;
}) {
  const heartScale = React.useRef(new Animated.Value(1)).current;
  const pressLike = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.18, speed: 32, bounciness: 8, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, speed: 28, bounciness: 5, useNativeDriver: true }),
    ]).start();
    onLike();
  };
  return <View testID="reel-action-rail" style={[styles.rail, compact && styles.railCompact]}>
    {ownerImage ? <Image source={{ uri: ownerImage }} style={styles.avatar} /> : null}
    <ReelActionButton label={liked ? "Retirer le j'aime" : "J'aime ce réel"} onPress={pressLike} active={liked} count={likes}>
      <Animated.View style={{ transform: [{ scale: heartScale }] }}><Heart color={liked ? '#FF496E' : '#fff'} size={31} strokeWidth={2.15} fill={liked ? '#FF496E' : 'transparent'} /></Animated.View>
    </ReelActionButton>
    <ReelActionButton label="Contacter via WhatsApp" onPress={onWhatsApp} disabled={!phone}><MessageCircle color="#fff" size={30} strokeWidth={2.05} /></ReelActionButton>
    <ReelActionButton label="Appeler" onPress={onCall} disabled={!phone}><PhoneCall color="#fff" size={29} strokeWidth={2.05} /></ReelActionButton>
    <ReelActionButton label="Offrir un cadeau" onPress={onGift}><Gift color="#fff" size={29} strokeWidth={2.05} /></ReelActionButton>
    <ReelActionButton label="Partager ce réel" onPress={onShare}><Share2 color="#fff" size={29} strokeWidth={2.05} /></ReelActionButton>
    <ReelActionButton label={muted ? 'Activer le son' : 'Couper le son'} onPress={onToggleMute}>{muted ? <VolumeX color="#fff" size={29} strokeWidth={2.05} /> : <Volume2 color="#fff" size={29} strokeWidth={2.05} />}</ReelActionButton>
  </View>;
}

function ReelDescription({ ownerName, description, property, expanded, onToggle }: {
  ownerName: string; description?: string; property?: Awaited<ReturnType<typeof getPropertyById>>; expanded: boolean; onToggle: () => void;
}) {
  return <View style={styles.caption}>
    {ownerName ? <Text style={styles.owner}>{ownerName}</Text> : null}
    {description ? <View><Text numberOfLines={expanded ? undefined : 2} style={styles.description}>{description}</Text>{description.length > 80 ? <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={expanded ? 'Réduire la description' : 'Développer la description'} onPress={onToggle} hitSlop={8}><Text style={styles.more}>{expanded ? 'Voir moins' : 'Voir plus'}</Text></Pressable> : null}</View> : null}
    {property ? <><Text numberOfLines={1} style={styles.property}>{property.title}</Text><Text numberOfLines={1} style={styles.meta}>{formatPrice(property.price)} · {property.city}</Text></> : <Text style={styles.meta}>Réel</Text>}
  </View>;
}

function ReelSlide({ reel, height, active, muted, toggleMute }: { reel: PublicReel; height: number; active: boolean; muted: boolean; toggleMute: () => void }) {
  const [hasFrame, setHasFrame] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [playing, setPlaying] = React.useState(active);
  const [showPlaybackFeedback, setShowPlaybackFeedback] = React.useState(false);
  const feedbackOpacity = React.useRef(new Animated.Value(0)).current;
  const [liked, setLiked] = React.useState(() => likedReelIds.has(reel.id));
  const [likes, setLikes] = React.useState(Math.max(0, reel.likeCount ?? 0));
  const player = useVideoPlayer(reel.videoUrl ?? null, (video) => { video.loop = true; video.muted = true; });
  const property = useQuery({ queryKey: ['property', reel.propertyId], queryFn: () => getPropertyById(reel.propertyId!), enabled: Boolean(reel.propertyId), staleTime: 600_000 }).data;
  const owner = useQuery({ queryKey: ['reel-owner', reel.createdBy], queryFn: () => getOwner(reel.createdBy), staleTime: 600_000 }).data;

  React.useEffect(() => { player.muted = muted; }, [muted, player]);
  React.useEffect(() => {
    if (active && reel.videoUrl) { player.currentTime = 0; player.play(); setPlaying(true); }
    else { player.pause(); setPlaying(false); setExpanded(false); }
  }, [active, player, reel.videoUrl]);

  const showPlaybackIndicator = React.useCallback(() => {
    setShowPlaybackFeedback(true);
    feedbackOpacity.stopAnimation();
    feedbackOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(320),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setShowPlaybackFeedback(false); });
  }, [feedbackOpacity]);
  const togglePlayback = () => {
    if (playing) player.pause(); else player.play();
    setPlaying((value) => !value);
    showPlaybackIndicator();
  };

  const phone = reel.contact ?? property?.whatsappContact ?? property?.contact ?? owner?.phoneNumbers?.[0];
  const ownerName = owner?.pseudo || [owner?.firstname, owner?.lastname].filter(Boolean).join(' ');
  const onLike = () => {
    const next = !liked;
    const delta = next ? 1 : -1;
    setLiked(next); setLikes((value) => Math.max(0, value + delta));
    next ? likedReelIds.add(reel.id) : likedReelIds.delete(reel.id);
    void trackReelLike(reel.id, next).catch(() => { setLiked(!next); setLikes((value) => Math.max(0, value - delta)); next ? likedReelIds.delete(reel.id) : likedReelIds.add(reel.id); });
  };
  const onWhatsApp = () => {
    if (!phone) return;
    const url = `${API_BASE_URL}/reels/${reel.id}`;
    const text = property ? `Bonjour, je suis intéressé par votre annonce "${property.title}" au prix de ${formatPrice(property.price)}, vue sur ce réel : ${url}` : `Bonjour, je suis intéressé par votre réel sur Trouve Ton Nkama : ${url}`;
    void Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
  };
  const onShare = async () => {
    const url = `${API_BASE_URL}/reels/${reel.id}`;
    const result = await Share.share({ title: property?.title ?? 'Réel Trouve Ton Nkama', message: `Regarde ce réel sur Trouve Ton Nkama : ${url}`, url });
    if (result.action === Share.sharedAction) void trackReelShare(reel.id).catch(() => undefined);
  };

  return <View testID={`reel-${reel.id}`} style={[styles.slide, { height }]}>
    <Pressable testID="reel-video-touch" style={StyleSheet.absoluteFill} onPress={togglePlayback} accessibilityRole="button" accessibilityLabel={playing ? 'Mettre le réel en pause' : 'Lire le réel'}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} onFirstFrameRender={() => setHasFrame(true)} />
    </Pressable>
    {reel.thumbnailUrl && (!hasFrame || !active) ? <Image source={{ uri: reel.thumbnailUrl }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : null}
    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.9)']} style={styles.overlay} />
    {(showPlaybackFeedback || !playing) ? <Animated.View pointerEvents="none" style={[styles.playbackOverlay, { opacity: showPlaybackFeedback ? feedbackOpacity : 1 }]}>{playing ? <Pause color="#fff" size={34} fill="rgba(255,255,255,0.16)" /> : <Play color="#fff" size={36} fill="rgba(255,255,255,0.18)" />}</Animated.View> : null}
    <ReelDescription ownerName={ownerName} description={reel.description} property={property} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />
    <ReelActionRail ownerImage={owner?.image} liked={liked} likes={likes} phone={phone} muted={muted} compact={height < 700} onLike={onLike} onWhatsApp={onWhatsApp} onCall={() => phone && void Linking.openURL(`tel:${phone}`)} onGift={() => Alert.alert('Cadeaux', 'Les cadeaux arrivent bientôt dans l’application mobile.')} onShare={() => void onShare()} onToggleMute={toggleMute} />
  </View>;
}

function EndSlide({ height, onCreate }: { height: number; onCreate: () => void }) {
  return <View style={[styles.end, { height }]}><View style={styles.endIcon}><Video color="#6EE7B7" size={29} /></View><Text style={styles.kicker}>Vous êtes à jour</Text><Text style={styles.endTitle}>Mettez votre bien en avant</Text><Text style={styles.endText}>Vous avez un logement ou un article à vendre ou à louer ? Publiez une courte vidéo pour le montrer et toucher plus de monde.</Text><Pressable accessibilityRole="button" onPress={onCreate} style={({ pressed }) => [styles.create, pressed && styles.pressed]}><PlusCircle color="#111827" size={20} /><Text style={styles.createText}>Créer un réel</Text></Pressable></View>;
}

export default function ReelsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = React.useState(0);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [category, setCategory] = React.useState<string | null>(null);
  const viewed = React.useRef(new Set<string>());
  const categories = useQuery({ queryKey: ['categories', 'active-roots'], queryFn: getActiveCategories, staleTime: 600_000 }).data ?? [];
  const query = useInfiniteQuery({ queryKey: ['reels-feed', category], initialPageParam: null as string | null, queryFn: ({ pageParam }) => listPublicReels(pageParam, category), getNextPageParam: (page) => page.nextCursor ?? undefined });
  const reels = React.useMemo(() => query.data?.pages.flatMap((page) => page.reels).filter((reel) => Boolean(reel.videoUrl)) ?? [], [query.data]);
  const items = React.useMemo<FeedItem[]>(() => {
    const result: FeedItem[] = reels.map((reel) => ({ kind: 'reel', id: reel.id, reel }));
    if (!query.hasNextPage && !query.isFetchingNextPage && result.length) result.push({ kind: 'end', id: 'end' });
    return result;
  }, [query.hasNextPage, query.isFetchingNextPage, reels]);
  React.useEffect(() => setActiveIndex(0), [category]);
  React.useEffect(() => {
    const item = items[activeIndex];
    if (item?.kind === 'reel' && !viewed.current.has(item.id)) { viewed.current.add(item.id); void trackReelView(item.id).catch(() => undefined); }
    if (items.length - activeIndex <= PREFETCH_THRESHOLD && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [activeIndex, items, query]);
  const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => { const index = viewableItems.find((item) => item.isViewable)?.index; if (typeof index === 'number') setActiveIndex(index); }).current;
  const renderItem = React.useCallback(({ item, index }: ListRenderItemInfo<FeedItem>) => item.kind === 'end' ? <EndSlide height={height} onCreate={() => navigation.navigate('Publier', { screen: 'CreateReel' })} /> : <ReelSlide reel={item.reel} height={height} active={index === activeIndex} muted={muted} toggleMute={() => setMuted((value) => !value)} />, [activeIndex, height, muted, navigation]);

  return <View testID="screen-reels" style={styles.screen} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    {query.isLoading ? <ActivityIndicator color="#fff" size="large" style={styles.center} /> : null}
    {query.isError && !reels.length ? <View style={styles.state}><Text style={styles.stateTitle}>Impossible de charger les réels</Text><Text style={styles.stateText}>Vérifiez votre connexion puis réessayez.</Text><Pressable onPress={() => void query.refetch()} style={styles.retry}><RefreshCw color="#111827" size={18} /><Text style={styles.retryText}>Réessayer</Text></Pressable></View> : null}
    {!query.isLoading && !query.isError && !reels.length ? <View style={styles.state}><Text style={styles.stateTitle}>Aucun réel pour le moment</Text><Text style={styles.stateText}>Revenez bientôt !</Text></View> : null}
    {height > 0 && reels.length ? <FlatList data={items} renderItem={renderItem} keyExtractor={(item) => item.id} pagingEnabled showsVerticalScrollIndicator={false} decelerationRate="fast" snapToInterval={height} getItemLayout={(_, index) => ({ length: height, offset: height * index, index })} initialNumToRender={2} maxToRenderPerBatch={3} windowSize={3} removeClippedSubviews viewabilityConfig={{ itemVisiblePercentThreshold: 70 }} onViewableItemsChanged={onViewableItemsChanged} ListFooterComponent={query.isFetchingNextPage ? <View style={[styles.footer, { height }]}><ActivityIndicator color="#fff" size="large" /></View> : null} /> : null}
    {categories.length >= 2 ? <View style={[styles.categories, { top: insets.top + 10 }]}>{[null, ...categories.map((item) => item.name)].map((name) => <Pressable accessibilityRole="button" accessibilityLabel={`Filtrer par ${name ?? 'toutes les catégories'}`} key={name ?? 'all'} onPress={() => setCategory(name)} style={[styles.pill, category === name && styles.pillActive]}><Text style={[styles.pillText, category === name && styles.pillTextActive]}>{name ?? 'Tout'}</Text></Pressable>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, slide: { width: '100%', overflow: 'hidden', backgroundColor: '#000' }, overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 }, caption: { position: 'absolute', left: 16, right: 82, bottom: 18, zIndex: 2 }, owner: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 5, textShadowColor: 'rgba(0,0,0,.72)', textShadowRadius: 5 }, description: { color: '#fff', fontSize: 14, lineHeight: 20, textShadowColor: 'rgba(0,0,0,.8)', textShadowRadius: 5 }, more: { alignSelf: 'flex-start', color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '800', paddingVertical: 5, textShadowColor: 'rgba(0,0,0,.8)', textShadowRadius: 4 }, property: { color: 'rgba(255,255,255,0.96)', fontSize: 14, lineHeight: 19, fontWeight: '700', marginTop: 3, textShadowColor: 'rgba(0,0,0,.75)', textShadowRadius: 4 }, meta: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '700', marginTop: 3, textShadowColor: 'rgba(0,0,0,.75)', textShadowRadius: 4 },
  playbackOverlay: { position: 'absolute', top: '50%', left: '50%', width: 72, height: 72, marginLeft: -36, marginTop: -36, borderRadius: 36, zIndex: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.38)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.22)' },
  rail: { position: 'absolute', right: 8, bottom: 16, zIndex: 3, width: 60, alignItems: 'center', gap: 8 }, railCompact: { gap: 4, bottom: 10 }, avatar: { width: 46, height: 46, marginBottom: 2, borderRadius: 23, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,.28)' }, actionSlot: { width: 60, alignItems: 'center' }, actionButton: { width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, actionSurface: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,15,18,.34)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.18)', shadowColor: '#000', shadowOpacity: .42, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 }, actionSurfaceActive: { backgroundColor: 'rgba(255,73,110,.14)', borderColor: 'rgba(255,125,151,.38)' }, count: { minWidth: 38, marginTop: -2, color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,.9)', textShadowRadius: 4 }, disabled: { opacity: 0.38 }, pressed: { opacity: 0.72, transform: [{ scale: 0.94 }] },
  categories: { position: 'absolute', alignSelf: 'center', zIndex: 5, flexDirection: 'row', gap: 3, padding: 5, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.68)' }, pill: { minHeight: 44, justifyContent: 'center', borderRadius: 22, paddingHorizontal: 16 }, pillActive: { backgroundColor: '#fff' }, pillText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' }, pillTextActive: { color: '#000' }, center: { position: 'absolute', inset: 0 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, stateTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' }, stateText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, marginTop: 7, textAlign: 'center' }, retry: { minHeight: 48, marginTop: 20, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8 }, retryText: { color: '#111827', fontWeight: '700' }, footer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  end: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#0A0A0A' }, endIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 }, kicker: { color: '#A7F3D0', fontSize: 14, fontWeight: '600' }, endTitle: { color: '#fff', fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 10 }, endText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, maxWidth: 360 }, create: { minHeight: 48, marginTop: 26, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 9 }, createText: { color: '#111827', fontSize: 14, fontWeight: '700' },
});
