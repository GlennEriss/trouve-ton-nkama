import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Building2, Send, Shirt, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createMobileReelId, createReel, markReelUploadFailed, uploadReelVideo } from '../api/reels';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PublishStackParamList, 'CreateReel'>;
type ReelCategory = 'Immobilier' | 'Mode';

export default function CreateReelScreen({ navigation }: Props) {
  const [videoAsset, setVideoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState<ReelCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseVideo = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Autorise l'accès à tes vidéos pour créer un réel.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if ((asset.duration ?? 0) > 10 * 60 * 1000) {
      setError('Vidéo trop longue (10 minutes maximum).');
      return;
    }
    setVideoAsset(asset);
  };

  const publish = async () => {
    if (!videoAsset || !category || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const reelId = createMobileReelId();
    const extension = videoAsset.fileName?.split('.').pop()?.toLowerCase() || 'mp4';
    const rawVideoPath = `reels-raw/${reelId.split('-')[0]}/${reelId}.${extension}`;
    try {
      await createReel({
        reelId,
        propertyId: null,
        rawVideoPath,
        contact: contact.trim() || undefined,
        description: description.trim() || undefined,
        categoryRoot: category,
      });
      try {
        setUploadPercent(0);
        await uploadReelVideo(videoAsset.uri, rawVideoPath, setUploadPercent);
      } catch (uploadError) {
        await markReelUploadFailed(reelId, uploadError instanceof Error ? uploadError.message : "Échec de l'envoi de la vidéo.");
        throw uploadError;
      }
      Alert.alert('Vidéo envoyée', "Le traitement démarre. Ton réel sera visible après validation par notre équipe.", [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de l'envoi du réel. Réessaie.");
    } finally {
      setUploadPercent(null);
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="screen-create-reel">
      <View style={styles.hero}>
        <View style={styles.eyebrow}><Video size={15} color={colors.primary} /><Text style={styles.eyebrowText}>ESPACE ANNONCEUR</Text></View>
        <Text style={styles.title}>Créer un réel</Text>
        <Text style={styles.subtitle}>Vidéo verticale, 10 minutes maximum.</Text>
        <View style={styles.notice}><Text style={styles.noticeText}>Pas encore classé Immobilier ou Mode</Text></View>
      </View>

      <TouchableOpacity
        testID="reel-video-picker"
        accessibilityRole="button"
        accessibilityLabel="Choisir une vidéo"
        activeOpacity={0.72}
        disabled={isSubmitting}
        onPress={chooseVideo}
        style={styles.dropzone}
      >
        <View style={styles.videoIcon}><Video size={28} color={colors.primary} /></View>
        <Text style={styles.dropzoneTitle}>{videoAsset ? videoAsset.fileName ?? 'Vidéo sélectionnée' : 'Choisir une vidéo'}</Text>
        <Text style={styles.dropzoneText}>{videoAsset ? 'Touchez pour remplacer la vidéo' : 'MP4 ou MOV — 10 minutes maximum'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Catégorie du réel</Text>
      <View style={styles.chips}>
        {(['Immobilier', 'Mode'] as ReelCategory[]).map((option) => {
          const selected = category === option;
          const Icon = option === 'Immobilier' ? Building2 : Shirt;
          return (
            <TouchableOpacity
              key={option}
              testID={`reel-category-${option.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCategory(option)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Icon size={16} color={selected ? '#fff' : colors.foreground} />
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Numéro de contact (optionnel)</Text>
      <TextInput testID="reel-contact" value={contact} onChangeText={setContact} editable={!isSubmitting} keyboardType="phone-pad" placeholder="Ex : +241 XX XX XX XX" style={styles.input} />
      <Text style={styles.label}>Légende (optionnelle)</Text>
      <TextInput testID="reel-description" value={description} onChangeText={(value) => setDescription(value.slice(0, 280))} editable={!isSubmitting} placeholder="Ajouter une légende..." multiline style={[styles.input, styles.textarea]} />
      <Text style={styles.counter}>{description.length}/280</Text>

      {uploadPercent !== null ? (
        <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressValue, { width: `${uploadPercent}%` }]} /></View><Text style={styles.progressText}>{uploadPercent}%</Text></View>
      ) : null}
      {error ? <View testID="reel-error" accessible><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}

      <TouchableOpacity
        testID="reel-submit"
        accessibilityRole="button"
        disabled={!videoAsset || !category || isSubmitting}
        onPress={publish}
        style={[styles.submit, (!videoAsset || !category || isSubmitting) && styles.disabled]}
      >
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <><Send size={19} color="#fff" /><Text style={styles.submitText}>Publier le réel</Text></>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, backgroundColor: '#fff', padding: 20, paddingBottom: 48 },
  hero: { borderWidth: 1, borderColor: '#D1FAE5', borderRadius: 24, padding: 20, backgroundColor: '#F0FDF9', marginBottom: 20 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.7, color: colors.primary },
  title: { marginTop: 8, fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.foreground },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 21, color: colors.mutedText },
  notice: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 999, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6 },
  noticeText: { color: '#92400E', fontSize: 12, fontWeight: '700' },
  dropzone: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 18, backgroundColor: '#fff' },
  videoIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F5F2' },
  dropzoneTitle: { marginTop: 14, color: '#374151', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  dropzoneText: { marginTop: 5, color: colors.mutedText, fontSize: 12, textAlign: 'center' },
  label: { marginTop: 18, marginBottom: 8, color: colors.foreground, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16 },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, color: colors.foreground, fontSize: 15 },
  textarea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', marginTop: 4, color: colors.mutedText, fontSize: 11 },
  progressRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 7, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E5E7EB' },
  progressValue: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  progressText: { width: 38, color: colors.mutedText, fontSize: 12, fontVariant: ['tabular-nums'] },
  error: { marginTop: 14, color: colors.destructive, fontSize: 13, lineHeight: 19 },
  submit: { minHeight: 52, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 999, backgroundColor: colors.primary },
  disabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
