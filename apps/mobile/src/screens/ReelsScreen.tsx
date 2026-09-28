import React from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, Share, StyleSheet, Text, View, type ListRenderItemInfo, type ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { Gift, Heart, MessageCircle, PhoneCall, PlusCircle, RefreshCw, Share2, Video, Volume2, VolumeX } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
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

function Action({ label, onPress, disabled, color = 'rgba(255,255,255,0.16)', children }: { label: string; onPress: () => void; disabled?: boolean; color?: string; children: React.ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { backgroundColor: color }, disabled && styles.disabled, pressed && styles.pressed]}>{children}</Pressable>;
}

function ReelSlide({ reel, height, active, muted, toggleMute }: { reel: PublicReel; height: number; active: boolean; muted: boolean; toggleMute: () => void }) {
  const [hasFrame, setHasFrame] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [liked, setLiked] = React.useState(() => likedReelIds.has(reel.id));
  const [likes, setLikes] = React.useState(Math.max(0, reel.likeCount ?? 0));
  const player = useVideoPlayer(reel.videoUrl ?? null, (video) => { video.loop = true; video.muted = true; });
  const property = useQuery({ queryKey: ['property', reel.propertyId], queryFn: () => getPropertyById(reel.propertyId!), enabled: Boolean(reel.propertyId), staleTime: 600_000 }).data;
  const owner = useQuery({ queryKey: ['reel-owner', reel.createdBy], queryFn: () => getOwner(reel.createdBy), staleTime: 600_000 }).data;

  React.useEffect(() => { player.muted = muted; }, [muted, player]);
  React.useEffect(() => {
    if (active && reel.videoUrl) { player.currentTime = 0; player.play(); }
    else { player.pause(); setExpanded(false); }
  }, [active, player, reel.videoUrl]);

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
    <Pressable style={StyleSheet.absoluteFill} onPress={toggleMute} accessibilityLabel={muted ? 'Activer le son' : 'Couper le son'}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} onFirstFrameRender={() => setHasFrame(true)} />
    </Pressable>
    {reel.thumbnailUrl && (!hasFrame || !active) ? <Image source={{ uri: reel.thumbnailUrl }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : null}
    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.9)']} style={styles.overlay} />
    <View style={styles.caption}>
      {ownerName ? <Text style={styles.owner}>{ownerName}</Text> : null}
      {reel.description ? <><Text numberOfLines={expanded ? undefined : 3} style={styles.description}>{reel.description}</Text>{reel.description.length > 110 ? <Pressable onPress={() => setExpanded((value) => !value)} hitSlop={8}><Text style={styles.more}>{expanded ? 'voir moins' : 'voir plus'}</Text></Pressable> : null}</> : null}
      {property ? <><Text numberOfLines={2} style={styles.property}>{property.title}</Text><Text style={styles.meta}>{formatPrice(property.price)} · {property.city}</Text></> : <Text style={styles.meta}>Réel</Text>}
    </View>
    <View style={styles.rail}>
      {owner?.image ? <Image source={{ uri: owner.image }} style={styles.avatar} /> : null}
      <View style={styles.withCount}><Action label={liked ? "Retirer le j'aime" : "J'aime ce réel"} onPress={onLike} color={liked ? '#E11D48' : undefined}><Heart color="#fff" size={21} fill={liked ? '#fff' : 'transparent'} /></Action>{likes ? <Text style={styles.count}>{likes}</Text> : null}</View>
      <Action label="Contacter via WhatsApp" onPress={onWhatsApp} disabled={!phone} color="#059669"><MessageCircle color="#fff" size={21} /></Action>
      <Action label="Appeler" onPress={() => phone && void Linking.openURL(`tel:${phone}`)} disabled={!phone} color="#2563EB"><PhoneCall color="#fff" size={20} /></Action>
      <Action label="Offrir un cadeau" onPress={() => Alert.alert('Cadeaux', 'Les cadeaux arrivent bientôt dans l’application mobile.')} color="#DB2777"><Gift color="#fff" size={20} /></Action>
      <Action label="Partager ce réel" onPress={() => void onShare()}><Share2 color="#fff" size={20} /></Action>
      <Action label={muted ? 'Activer le son' : 'Couper le son'} onPress={toggleMute}>{muted ? <VolumeX color="#fff" size={20} /> : <Volume2 color="#fff" size={20} />}</Action>
    </View>
  </View>;
}

function EndSlide({ height, onCreate }: { height: number; onCreate: () => void }) {
  return <View style={[styles.end, { height }]}><View style={styles.endIcon}><Video color="#6EE7B7" size={29} /></View><Text style={styles.kicker}>Vous êtes à jour</Text><Text style={styles.endTitle}>Mettez votre bien en avant</Text><Text style={styles.endText}>Vous avez un logement ou un article à vendre ou à louer ? Publiez une courte vidéo pour le montrer et toucher plus de monde.</Text><Pressable accessibilityRole="button" onPress={onCreate} style={({ pressed }) => [styles.create, pressed && styles.pressed]}><PlusCircle color="#111827" size={20} /><Text style={styles.createText}>Créer un réel</Text></Pressable></View>;
}

export default function ReelsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
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
    {categories.length >= 2 ? <View style={styles.categories}>{[null, ...categories.map((item) => item.name)].map((name) => <Pressable key={name ?? 'all'} onPress={() => setCategory(name)} style={[styles.pill, category === name && styles.pillActive]}><Text style={[styles.pillText, category === name && styles.pillTextActive]}>{name ?? 'Tout'}</Text></Pressable>)}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, slide: { width: '100%', overflow: 'hidden', backgroundColor: '#000' }, overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 280 }, caption: { position: 'absolute', left: 16, right: 84, bottom: 22, zIndex: 2 }, owner: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 5 }, description: { color: 'rgba(255,255,255,0.95)', fontSize: 14, lineHeight: 19 }, more: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700', paddingVertical: 4 }, property: { color: 'rgba(255,255,255,0.92)', fontSize: 14, lineHeight: 19, marginTop: 3 }, meta: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginTop: 3 },
  rail: { position: 'absolute', right: 10, bottom: 20, zIndex: 3, alignItems: 'center', gap: 12 }, avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff' }, action: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, withCount: { alignItems: 'center', gap: 2 }, count: { color: '#fff', fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  categories: { position: 'absolute', top: 12, alignSelf: 'center', zIndex: 5, flexDirection: 'row', gap: 2, padding: 4, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)' }, pill: { minHeight: 36, justifyContent: 'center', borderRadius: 18, paddingHorizontal: 13 }, pillActive: { backgroundColor: '#fff' }, pillText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600' }, pillTextActive: { color: '#000' }, center: { position: 'absolute', inset: 0 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, stateTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' }, stateText: { color: 'rgba(255,255,255,0.62)', fontSize: 14, marginTop: 7, textAlign: 'center' }, retry: { minHeight: 48, marginTop: 20, paddingHorizontal: 22, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8 }, retryText: { color: '#111827', fontWeight: '700' }, footer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  end: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: '#0A0A0A' }, endIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 20 }, kicker: { color: '#A7F3D0', fontSize: 14, fontWeight: '600' }, endTitle: { color: '#fff', fontSize: 25, fontWeight: '800', textAlign: 'center', marginTop: 10 }, endText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, maxWidth: 360 }, create: { minHeight: 48, marginTop: 26, paddingHorizontal: 24, borderRadius: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 9 }, createText: { color: '#111827', fontSize: 14, fontWeight: '700' },
});
