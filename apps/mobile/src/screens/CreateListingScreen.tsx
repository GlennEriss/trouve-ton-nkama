import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ImagePlus, Sparkles, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getPublishableLeaves } from '../api/categories';
import { createMobileListing, requestCategoryDraft, requestPropertyDraft, uploadListingImages, type GenerationPhase } from '../api/publishing';
import { colors } from '../theme/colors';
import type { PublishStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<PublishStackParamList, 'CreateListing'>;
const MAX_IMAGES = 10;
const PHASE_LABELS: Record<GenerationPhase, string> = {
  idle: "Générer l'annonce", photos: 'Envoi des photos…', generation: "Génération par l'IA…",
  validation: 'Validation…', enregistrement: 'Enregistrement…',
};

export default function CreateListingScreen({ route, navigation }: Props) {
  const isRealEstate = route.params.categorySlug === 'immobilier';
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [province, setProvince] = useState('Estuaire');
  const [city, setCity] = useState('Libreville');
  const [district, setDistrict] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = phase !== 'idle';

  const missing = useMemo(() => {
    const values: string[] = [];
    if (description.trim().length < 10) values.push('une description');
    if (images.length === 0) values.push('au moins une photo');
    if (isRealEstate && !district.trim()) values.push('un quartier');
    return values;
  }, [description, district, images.length, isRealEstate]);

  const pickImages = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Autorise l'accès à tes photos pour publier une annonce.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - images.length, quality: 0.85,
    });
    if (!result.canceled) setImages((current) => [...current, ...result.assets].slice(0, MAX_IMAGES));
  };

  const generate = async () => {
    setError(null);
    if (missing.length > 0) return setError(`Complète d'abord : ${missing.join(', ')}.`);
    try {
      setPhase('photos');
      const uploadedImages = await uploadListingImages(images);
      setPhase('generation');
      let draft = isRealEstate ? await requestPropertyDraft(description.trim()) : await requestCategoryDraft(description.trim());

      if (!isRealEstate) {
        setPhase('validation');
        const leaves = await getPublishableLeaves();
        const leaf = leaves.find((item) => item.id === draft.categoryId);
        if (!leaf) throw new Error('Catégorie détectée introuvable. Réessaie.');
        draft = { ...draft, categoryPath: { lvl0: leaf.rootName, lvl1: `${leaf.rootName} > ${leaf.name}` } };
      }

      setPhase('enregistrement');
      const result = await createMobileListing(isRealEstate
        ? { kind: 'immobilier', draft, images: uploadedImages, isOwner, province: province.trim(), city: city.trim(), district: district.trim() }
        : { kind: 'category', draft, images: uploadedImages });
      Alert.alert('Annonce créée', 'Ton annonce a été envoyée et sera visible après validation par notre équipe.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
      return result.id;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la création de l'annonce.");
    } finally {
      setPhase('idle');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, !isRealEstate && styles.modeBackground]} keyboardShouldPersistTaps="handled" testID="screen-create-listing">
      {isRealEstate ? (
        <>
          <View style={styles.titleRow}><Sparkles size={24} color={colors.primary} /><Text style={styles.realEstateTitle}>Créer une annonce avec l&apos;IA</Text></View>
          <Text style={styles.intro}>Décris ton bien, ajoute des photos et un quartier — l&apos;IA détermine le type de bien et rédige le reste. Tu pourras tout corriger juste après.</Text>
        </>
      ) : (
        <Text style={styles.modeTitle}>Décrivez votre annonce et laissez l&apos;IA faire le reste</Text>
      )}

      <View style={[styles.card, !isRealEstate && styles.modeComposer]}>
        {isRealEstate ? <Text style={styles.label}>Description du bien</Text> : null}
        <TextInput
          testID="listing-description"
          value={description}
          onChangeText={setDescription}
          editable={!isSubmitting}
          multiline
          placeholder={isRealEstate
            ? 'Ex : Studio meublé à louer à Akébé Poteau, sécurisé, 150 000 FCFA/mois. Contact 077...'
            : 'Ex : Robe Zara taille M, très bon état. Disponible à Libreville. Prix 15 000 FCFA.'}
          style={[styles.textarea, !isRealEstate && styles.modeTextarea]}
        />
        <View style={styles.photoActionRow}>
          <TouchableOpacity testID="listing-image-picker" accessibilityRole="button" accessibilityLabel="Ajouter des photos" onPress={pickImages} disabled={isSubmitting} style={styles.photoButton}>
            <ImagePlus size={21} color={colors.mutedText} />
          </TouchableOpacity>
          <Text style={styles.photoCount}>{images.length > 0 ? `${images.length} photo${images.length > 1 ? 's' : ''}` : 'Photos'}</Text>
        </View>
      </View>

      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previews}>
          {images.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} />
              <TouchableOpacity accessibilityLabel="Supprimer cette photo" onPress={() => setImages((current) => current.filter((_, i) => i !== index))} style={styles.removePhoto}><X size={14} color="#fff" /></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {isRealEstate ? (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            <Text style={styles.label}>Province</Text><TextInput testID="listing-province" value={province} onChangeText={setProvince} editable={!isSubmitting} style={styles.input} />
            <Text style={styles.label}>Ville</Text><TextInput testID="listing-city" value={city} onChangeText={setCity} editable={!isSubmitting} style={styles.input} />
            <Text style={styles.label}>Quartier</Text><TextInput testID="listing-district" value={district} onChangeText={setDistrict} editable={!isSubmitting} placeholder="Ex : Nzeng-Ayong" style={styles.input} />
          </View>
          <View style={[styles.card, styles.ownerRow]}>
            <View style={styles.ownerCopy}><Text style={styles.label}>Vous êtes le propriétaire de ce bien ?</Text><Text style={styles.helper}>Sinon, l&apos;annonce sera marquée comme gérée par une agence ou un intermédiaire.</Text></View>
            <Switch testID="listing-is-owner" value={isOwner} onValueChange={setIsOwner} disabled={isSubmitting} trackColor={{ true: colors.primary }} />
          </View>
        </>
      ) : null}

      {error ? <View testID="listing-error" accessible><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}
      <TouchableOpacity testID="listing-submit" accessibilityRole="button" disabled={isSubmitting} onPress={generate} style={[styles.submit, isSubmitting && styles.disabled]}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Sparkles size={20} color="#fff" />}
        <Text style={styles.submitText}>{PHASE_LABELS[phase]}</Text>
      </TouchableOpacity>
      <Text style={styles.creditNote}>Coût : 1 crédit</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, backgroundColor: '#fff', padding: 20, paddingBottom: 48, gap: 18 },
  modeBackground: { backgroundColor: '#F8FAFC' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  realEstateTitle: { flex: 1, color: colors.foreground, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  intro: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  modeTitle: { color: colors.foreground, fontSize: 27, lineHeight: 34, fontWeight: '900', textAlign: 'center', paddingHorizontal: 8 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#fff', padding: 18, gap: 8 },
  modeComposer: { borderRadius: 24, padding: 0, overflow: 'hidden' },
  label: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  textarea: { minHeight: 132, padding: 0, color: colors.foreground, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  modeTextarea: { minHeight: 170, padding: 20 },
  photoActionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  photoButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  photoCount: { color: colors.mutedText, fontSize: 12 },
  previews: { gap: 12, paddingVertical: 2 },
  previewWrap: { width: 84, height: 84 },
  preview: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#F3F4F6' },
  removePhoto: { position: 'absolute', right: -5, top: -5, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginBottom: 4, color: colors.foreground, fontSize: 16, fontWeight: '800' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 13, marginBottom: 8, color: colors.foreground, fontSize: 15 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  ownerCopy: { flex: 1, gap: 4 },
  helper: { color: colors.mutedText, fontSize: 12, lineHeight: 17 },
  error: { borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, backgroundColor: '#FEF2F2', padding: 12, color: colors.destructive, fontSize: 13, lineHeight: 19 },
  submit: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 999, backgroundColor: colors.primary },
  disabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  creditNote: { marginTop: -10, color: colors.mutedText, fontSize: 12, textAlign: 'center' },
});
