import React from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer, type VideoThumbnail } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, Check, Link2, Pencil, Send, Shirt, Video, Volume2, VolumeX, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { buildMobileRawReelVideoPath, createMobileReelId, createReel, markReelUploadFailed, uploadReelVideo } from '../api/reels';
import { listMyListings, type MyListingItem } from '../api/myListings';
import { useUserDoc } from '../hooks/useUserDoc';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PublishStackParamList, 'CreateReel'>;
type ReelCategory = 'Immobilier' | 'Mode';
const MAX_DURATION_SECONDS = 600;
const MAX_RAW_SIZE_BYTES = 1000 * 1024 * 1024;
const FRAME_COUNT = 10;

const formatDuration = (seconds: number) => `${Math.floor(Math.max(0, Math.round(seconds)) / 60)}:${String(Math.max(0, Math.round(seconds)) % 60).padStart(2, '0')}`;
const formatSize = (bytes?: number | null) => bytes ? `${(bytes / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo` : 'taille inconnue';
const listingCategory = (listing: MyListingItem): ReelCategory => listing.typeProperty ? 'Immobilier' : 'Mode';

function validateVideo(asset: ImagePicker.ImagePickerAsset) {
  const duration = (asset.duration ?? 0) / 1000;
  const extension = asset.fileName?.split('.').pop()?.toLowerCase();
  if (!duration || !Number.isFinite(duration)) return 'Impossible de lire cette vidéo, réessayez avec un autre fichier.';
  if (duration > MAX_DURATION_SECONDS) return 'Vidéo trop longue (10 minutes maximum).';
  if (asset.fileSize && asset.fileSize > MAX_RAW_SIZE_BYTES) return 'Fichier trop volumineux.';
  if (extension && !['mp4', 'mov', 'webm'].includes(extension)) return 'Format non supporté. Utilisez MP4, MOV ou WebM.';
  return null;
}

function TrimTimeline({ frames, duration, start, end, disabled, onChange }: {
  frames: VideoThumbnail[]; duration: number; start: number; end: number; disabled: boolean;
  onChange: (start: number, end: number) => void;
}) {
  const width = React.useRef(0);
  const initial = React.useRef({ start, end });
  const pan = React.useCallback((side: 'start' | 'end') => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: () => { initial.current = { start, end }; },
    onPanResponderMove: (_, gesture) => {
      if (!width.current) return;
      const delta = gesture.dx / width.current * duration;
      if (side === 'start') onChange(Math.max(0, Math.min(initial.current.start + delta, end - 1)), end);
      else onChange(start, Math.min(duration, Math.max(initial.current.end + delta, start + 1)));
    },
  }), [disabled, duration, end, onChange, start]);
  const startPan = React.useMemo(() => pan('start'), [pan]);
  const endPan = React.useMemo(() => pan('end'), [pan]);
  const left = duration ? start / duration * 100 : 0;
  const right = duration ? end / duration * 100 : 100;
  return <View testID="reel-trim-timeline" style={styles.timeline} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
    <View style={styles.frames}>{frames.length ? frames.map((frame, i) => <Image key={`${frame.requestedTime}-${i}`} source={frame} contentFit="cover" style={styles.frame} />) : Array.from({ length: FRAME_COUNT }, (_, i) => <View key={i} style={styles.framePlaceholder} />)}</View>
    <View pointerEvents="none" style={[styles.shade, { left: 0, width: `${left}%` }]} />
    <View pointerEvents="none" style={[styles.shade, { right: 0, width: `${100 - right}%` }]} />
    <View pointerEvents="none" style={[styles.selection, { left: `${left}%`, width: `${right - left}%` }]} />
    <View testID="reel-trim-start" style={[styles.handleTouch, { left: `${left}%` }]} {...startPan.panHandlers}><View style={styles.handle} /></View>
    <View testID="reel-trim-end" style={[styles.handleTouch, { left: `${right}%` }]} {...endPan.panHandlers}><View style={styles.handle} /></View>
  </View>;
}

function ReelVideoEditor({ asset, start, end, muted, busy, onTrim, onMute }: {
  asset: ImagePicker.ImagePickerAsset; start: number; end: number; muted: boolean; busy: boolean;
  onTrim: (start: number, end: number) => void; onMute: () => void;
}) {
  const duration = (asset.duration ?? 0) / 1000;
  const [frames, setFrames] = React.useState<VideoThumbnail[]>([]);
  const player = useVideoPlayer(asset.uri, (video) => { video.loop = true; video.muted = muted; video.currentTime = start; });
  React.useEffect(() => { player.muted = muted; }, [muted, player]);
  React.useEffect(() => {
    let active = true;
    const times = Array.from({ length: FRAME_COUNT }, (_, i) => Math.min(duration * i / FRAME_COUNT, Math.max(0, duration - 0.05)));
    player.generateThumbnailsAsync(times, { maxHeight: 72 }).then((value) => { if (active) setFrames(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [duration, player]);
  React.useEffect(() => {
    if (player.currentTime < start || player.currentTime >= end) player.currentTime = start;
    const timer = setInterval(() => { if (player.currentTime >= end) player.currentTime = start; }, 250);
    return () => clearInterval(timer);
  }, [end, player, start]);
  React.useEffect(() => {
    player.play();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') player.play();
      else player.pause();
    });
    return () => { subscription.remove(); player.pause(); };
  }, [player]);
  return <View style={styles.editorBody}>
    <View style={styles.timelineArea}>
      <TrimTimeline frames={frames} duration={duration} start={start} end={end} disabled={busy} onChange={onTrim} />
      <View style={styles.metaRow}>
        <Pressable testID="reel-mute" accessibilityRole="button" accessibilityLabel={muted ? 'Réactiver le son' : 'Couper le son'} onPress={onMute} disabled={busy} style={styles.roundControl}>{muted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}</Pressable>
        <Text testID="reel-video-metadata" style={styles.meta}>{formatDuration(end - start)} · {formatSize(asset.fileSize)}</Text>
      </View>
    </View>
    <Pressable accessibilityLabel={player.playing ? 'Mettre la vidéo en pause' : 'Lire la vidéo'} onPress={() => player.playing ? player.pause() : player.play()} style={styles.preview}>
      <VideoView testID="reel-video-preview" player={player} nativeControls={false} contentFit="contain" style={StyleSheet.absoluteFill} />
    </Pressable>
  </View>;
}

export default function CreateReelScreen({ navigation }: Props) {
  const { userDoc } = useUserDoc();
  const [asset, setAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [editingContact, setEditingContact] = React.useState(false);
  const [category, setCategory] = React.useState<ReelCategory | null>(null);
  const [listing, setListing] = React.useState<MyListingItem | null>(null);
  const [listings, setListings] = React.useState<MyListingItem[]>([]);
  const [listingModal, setListingModal] = React.useState(false);
  const [loadingListings, setLoadingListings] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const contactTouched = React.useRef(false);
  const submittingRef = React.useRef(false);

  React.useEffect(() => {
    if (contactTouched.current) return;
    const fallback = listing?.contact ?? userDoc?.callNumber ?? userDoc?.phoneNumbers?.[0];
    if (fallback) setContact(fallback);
  }, [listing?.contact, userDoc?.callNumber, userDoc?.phoneNumbers?.[0]]);

  const chooseVideo = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Autorise l'accès à tes vidéos pour créer un réel.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (result.canceled) return;
    const selected = result.assets[0];
    const problem = validateVideo(selected);
    if (problem) return setError(problem);
    const duration = (selected.duration ?? 0) / 1000;
    setAsset(selected); setStart(0); setEnd(duration); setMuted(false);
  };

  const openListings = async () => {
    setListingModal(true);
    if (listings.length) return;
    setLoadingListings(true);
    try { setListings(await listMyListings()); }
    catch { setError('Impossible de charger vos annonces.'); }
    finally { setLoadingListings(false); }
  };

  const close = () => {
    if (!asset) return navigation.goBack();
    Alert.alert('Abandonner ce réel ?', 'La vidéo et les modifications en cours seront perdues.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const publish = async () => {
    if (!asset || submittingRef.current) return;
    submittingRef.current = true; setSubmitting(true); setError(null);
    const reelId = createMobileReelId();
    try {
      const path = buildMobileRawReelVideoPath(reelId, asset.fileName);
      const duration = (asset.duration ?? 0) / 1000;
      const trimmed = start > 0 || end < duration;
      await createReel({ reelId, propertyId: listing?.id ?? null, rawVideoPath: path, contact: contact.trim() || undefined, description: description.trim() || undefined, ...(!listing && category ? { categoryRoot: category } : {}), ...(trimmed ? { trimStartSeconds: start, trimEndSeconds: end } : {}), ...(muted ? { muted: true } : {}) });
      try { setProgress(0); await uploadReelVideo(asset.uri, path, setProgress, asset.mimeType ?? 'video/mp4'); }
      catch (cause) { await markReelUploadFailed(reelId, cause instanceof Error ? cause.message : "Échec de l'envoi de la vidéo."); throw cause; }
      Alert.alert('Vidéo envoyée', "Le traitement démarre. Ton réel sera visible après validation par notre équipe.", [{ text: 'OK', onPress: () => navigation.popToTop() }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Échec de l'envoi du réel. Réessaie."); }
    finally { setProgress(null); setSubmitting(false); submittingRef.current = false; }
  };

  return <SafeAreaView testID="screen-create-reel" style={styles.screen} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable testID="reel-close" accessibilityLabel="Fermer l’éditeur" disabled={submitting} onPress={close} style={styles.close}><X size={23} color="#fff" /></Pressable>
        {listing ? <Pressable onPress={openListings} style={styles.linkedBadge}><Link2 size={13} color="#fff" /><Text numberOfLines={1} style={styles.linkedText}>Pour « {listing.title} »</Text><Text style={styles.linkedCategory}>{listingCategory(listing)}</Text></Pressable> : null}
      </View>
      {asset ? <>
        <ReelVideoEditor asset={asset} start={start} end={end} muted={muted} busy={submitting} onTrim={(a, b) => { setStart(a); setEnd(b); }} onMute={() => setMuted((value) => !value)} />
        <View style={styles.composer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.controls}>
            <Pressable testID="reel-contact-toggle" onPress={() => setEditingContact((value) => !value)} style={styles.chip}><Pencil size={14} color="#fff" /><Text numberOfLines={1} style={styles.chipText}>{contact ? `Contact : ${contact}` : 'Ajouter un contact'}</Text></Pressable>
            <Pressable testID="reel-listing-picker" onPress={openListings} style={styles.chip}><Link2 size={14} color="#fff" /><Text style={styles.chipText}>{listing ? 'Changer l’annonce' : 'Lier une annonce'}</Text></Pressable>
            {!listing ? (['Immobilier', 'Mode'] as ReelCategory[]).map((option) => { const selected = category === option; const Icon = option === 'Immobilier' ? Building2 : Shirt; return <Pressable key={option} testID={`reel-category-${option.toLowerCase()}`} accessibilityState={{ selected }} onPress={() => setCategory((value) => value === option ? null : option)} style={[styles.chip, selected && styles.chipSelected]}><Icon size={14} color="#fff" /><Text style={styles.chipText}>{option}</Text></Pressable>; }) : null}
          </ScrollView>
          {editingContact ? <TextInput testID="reel-contact" value={contact} onChangeText={(value) => { contactTouched.current = true; setContact(value); }} keyboardType="phone-pad" placeholder="Ex : +241 XX XX XX XX" placeholderTextColor="rgba(255,255,255,.48)" style={styles.contactInput} /> : null}
          {progress !== null ? <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressValue, { width: `${progress}%` }]} /></View><Text style={styles.progressText}>{progress}%</Text></View> : null}
          {error ? <Text testID="reel-error" accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.captionRow}>
            <TextInput testID="reel-description" value={description} onChangeText={(value) => setDescription(value.slice(0, 280))} editable={!submitting} placeholder="Ajouter une légende..." placeholderTextColor="rgba(255,255,255,.55)" style={styles.captionInput} />
            <Pressable testID="reel-submit" accessibilityLabel="Publier le réel" accessibilityState={{ disabled: submitting }} disabled={submitting} onPress={() => void publish()} style={[styles.send, submitting && styles.disabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Send size={20} color="#fff" />}</Pressable>
          </View>
        </View>
      </> : <View style={styles.empty}>
        <View style={styles.emptyIcon}><Video size={30} color="#5EEAD4" /></View><Text style={styles.emptyTitle}>Choisir une vidéo</Text><Text style={styles.emptyText}>MP4, MOV ou WebM · 10 minutes maximum</Text>
        {error ? <Text testID="reel-error" accessibilityRole="alert" style={styles.emptyError}>{error}</Text> : null}
        <Pressable testID="reel-video-picker" accessibilityLabel="Choisir une vidéo" onPress={chooseVideo} style={styles.choose}><Video size={19} color="#062E2A" /><Text style={styles.chooseText}>Ouvrir la galerie</Text></Pressable>
      </View>}
      <Modal visible={listingModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setListingModal(false)}>
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Choisir une annonce</Text><Text style={styles.modalSubtitle}>Ou gardez ce réel indépendant.</Text></View><Pressable accessibilityLabel="Fermer" onPress={() => setListingModal(false)} style={styles.modalClose}><X size={22} color="#111827" /></Pressable></View>
          <Pressable testID="reel-listing-none" onPress={() => { setListing(null); setListingModal(false); }} style={styles.noListing}><Video size={22} color={colors.primary} /><View style={styles.listingCopy}><Text style={styles.listingTitle}>Créer sans annonce</Text><Text style={styles.listingMeta}>Vous pourrez rattacher le réel plus tard.</Text></View>{!listing ? <Check size={20} color={colors.primary} /> : null}</Pressable>
          {loadingListings ? <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} /> : <ScrollView contentContainerStyle={styles.listings}>{listings.map((item) => <Pressable key={item.id} testID={`reel-listing-${item.id}`} onPress={() => { setListing(item); setCategory(null); contactTouched.current = false; if (item.contact) setContact(item.contact); setListingModal(false); }} style={styles.listingRow}><View style={styles.listingIcon}>{listingCategory(item) === 'Immobilier' ? <Building2 size={21} color={colors.primary} /> : <Shirt size={21} color={colors.primary} />}</View><View style={styles.listingCopy}><Text numberOfLines={1} style={styles.listingTitle}>{item.title}</Text><Text style={styles.listingMeta}>{listingCategory(item)} · {item.city}</Text></View>{listing?.id === item.id ? <Check size={20} color={colors.primary} /> : null}</Pressable>)}{!listings.length ? <Text style={styles.noListings}>Vous n’avez aucune annonce pour le moment.</Text> : null}</ScrollView>}
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, topBar: { minHeight: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.1)' },
  linkedBadge: { maxWidth: '78%', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,.1)' }, linkedText: { flexShrink: 1, color: 'rgba(255,255,255,.82)', fontSize: 12 }, linkedCategory: { color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.14)' },
  editorBody: { flex: 1, minHeight: 0 }, timelineArea: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }, timeline: { height: 64, overflow: 'hidden', borderRadius: 9, backgroundColor: '#262626' }, frames: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' }, frame: { flex: 1, height: '100%' }, framePlaceholder: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#404040', backgroundColor: '#262626' }, shade: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.62)' }, selection: { position: 'absolute', top: 0, bottom: 0, borderWidth: 2, borderColor: '#fff', borderRadius: 7 }, handleTouch: { position: 'absolute', top: 0, bottom: 0, width: 44, marginLeft: -22, alignItems: 'center', justifyContent: 'center' }, handle: { width: 5, height: 42, borderRadius: 3, backgroundColor: '#fff' },
  metaRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 }, roundControl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.13)' }, meta: { color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.11)', fontVariant: ['tabular-nums'] }, preview: { flex: 1, minHeight: 140, marginHorizontal: 16, overflow: 'hidden', borderRadius: 10, backgroundColor: '#050505' },
  composer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 }, controls: { gap: 8, paddingRight: 8 }, chip: { minHeight: 44, maxWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.11)' }, chipSelected: { backgroundColor: colors.primary }, chipText: { flexShrink: 1, color: 'rgba(255,255,255,.88)', fontSize: 12, fontWeight: '600' }, contactInput: { height: 44, borderRadius: 22, paddingHorizontal: 15, color: '#fff', fontSize: 14, backgroundColor: 'rgba(255,255,255,.11)' },
  progressRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 9 }, progressTrack: { flex: 1, height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(255,255,255,.15)' }, progressValue: { height: '100%', backgroundColor: '#14B8A6' }, progressText: { width: 38, color: 'rgba(255,255,255,.72)', fontSize: 11 }, error: { color: '#FCA5A5', fontSize: 12 }, captionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 }, captionInput: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 16, color: '#fff', fontSize: 14, backgroundColor: 'rgba(255,255,255,.11)' }, send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }, disabled: { opacity: .5 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 64 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(94,234,212,.3)', backgroundColor: 'rgba(20,184,166,.13)' }, emptyTitle: { marginTop: 18, color: '#fff', fontSize: 22, fontWeight: '800' }, emptyText: { marginTop: 7, color: 'rgba(255,255,255,.62)', fontSize: 13 }, emptyError: { marginTop: 16, color: '#FCA5A5', fontSize: 13, textAlign: 'center' }, choose: { minHeight: 50, marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, borderRadius: 25, backgroundColor: '#5EEAD4' }, chooseText: { color: '#062E2A', fontSize: 14, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: '#F8FAFC' }, modalHeader: { minHeight: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D5DB' }, modalTitle: { color: '#111827', fontSize: 20, fontWeight: '800' }, modalSubtitle: { marginTop: 3, color: '#6B7280', fontSize: 12 }, modalClose: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }, noListing: { minHeight: 76, margin: 16, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 16, backgroundColor: '#F0FDFA' }, listings: { padding: 16, gap: 10, paddingBottom: 36 }, listingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 15, backgroundColor: '#fff' }, listingIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5F3' }, listingCopy: { flex: 1 }, listingTitle: { color: '#111827', fontSize: 14, fontWeight: '700' }, listingMeta: { marginTop: 3, color: '#6B7280', fontSize: 12 }, noListings: { marginTop: 36, color: '#6B7280', fontSize: 14, textAlign: 'center' },
});
