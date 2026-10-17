import React from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ImagePlus, Save, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMyListing, updateMyListing } from '../api/myListings';
import { uploadListingImages } from '../api/publishing';
import { getImageUrl, type PropertyImage } from '../lib/propertyImage';
import { navigationRef } from '../navigation/navigationRef';
import type { PublishStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<PublishStackParamList, 'EditListing'>;
const MAX_IMAGES = 10;

export default function EditListingScreen({ route }: Props) {
  const queryClient = useQueryClient();
  const listingQuery = useQuery({ queryKey: ['my-listing', route.params.listingId], queryFn: () => getMyListing(route.params.listingId) });
  const [initialized, setInitialized] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [province, setProvince] = React.useState('');
  const [city, setCity] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [isOwner, setIsOwner] = React.useState(false);
  const [existingImages, setExistingImages] = React.useState<PropertyImage[]>([]);
  const [newImages, setNewImages] = React.useState<ImagePicker.ImagePickerAsset[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const listing = listingQuery.data;
    if (!listing || initialized) return;
    setTitle(listing.title ?? '');
    setDescription(listing.description ?? '');
    setPrice(String(listing.price ?? ''));
    setProvince(listing.province ?? '');
    setCity(listing.city ?? '');
    setDistrict(listing.street ?? '');
    setIsOwner(Boolean(listing.isOwner));
    setExistingImages(listing.images ?? []);
    setInitialized(true);
  }, [initialized, listingQuery.data]);

  const pickImages = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError("Autorise l’accès à tes photos pour modifier l’annonce.");
    const slots = MAX_IMAGES - existingImages.length - newImages.length;
    if (slots <= 0) return setError(`Maximum ${MAX_IMAGES} photos.`);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: slots, quality: 0.85 });
    if (!result.canceled) setNewImages((current) => [...current, ...result.assets].slice(0, slots + current.length));
  };

  const confirmRemoveExisting = (index: number) => {
    Alert.alert('Supprimer cette photo ?', 'Elle ne sera retirée de l’annonce qu’après l’enregistrement des modifications.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setExistingImages((current) => current.filter((_, imageIndex) => imageIndex !== index)) },
    ]);
  };

  const save = async () => {
    const numericPrice = Number(price.replace(/\s/g, ''));
    if (title.trim().length < 3) return setError('Le titre doit contenir au moins 3 caractères.');
    if (description.trim().length < 10) return setError('La description doit contenir au moins 10 caractères.');
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return setError('Indique un prix valide.');
    if (existingImages.length + newImages.length === 0) return setError('Conserve ou ajoute au moins une photo.');
    const listing = listingQuery.data;
    if (!listing) return;

    setSaving(true);
    setError(null);
    try {
      const uploaded = newImages.length ? await uploadListingImages(newImages) : [];
      await updateMyListing(listing.id, {
        title: title.trim(), description: description.trim(), price: numericPrice,
        province: province.trim(), city: city.trim(), street: district.trim(), isOwner,
        images: [...existingImages, ...uploaded],
      }, listing.moderationStatus === 'REJECTED');
      await queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      Alert.alert('Annonce modifiée', listing.moderationStatus === 'REJECTED' ? 'Tes modifications sont enregistrées et l’annonce a été renvoyée en validation.' : 'Tes modifications ont bien été enregistrées.', [
        { text: 'OK', onPress: () => navigationRef.navigate('Main', { screen: 'MainTabs', params: { screen: 'ProfilOuConnexion', params: { screen: 'MyListings' } } }) },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier cette annonce.');
    } finally {
      setSaving(false);
    }
  };

  if (listingQuery.isLoading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (listingQuery.isError || !listingQuery.data) return <View style={styles.center}><Text style={styles.error}>Impossible de charger cette annonce.</Text></View>;
  if (!initialized) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  const isRealEstate = Boolean(listingQuery.data.typeProperty);

  return <ScrollView testID="screen-edit-listing" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <Text style={styles.heading}>{isRealEstate ? 'Modifier l’annonce immobilière' : 'Modifier l’annonce Mode'}</Text>
    <Text style={styles.intro}>Corrige les informations et les photos, puis enregistre tes changements.</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Titre</Text><TextInput testID="edit-listing-title" value={title} onChangeText={setTitle} editable={!saving} style={styles.input} />
      <Text style={styles.label}>Description</Text><TextInput testID="edit-listing-description" value={description} onChangeText={setDescription} editable={!saving} multiline style={[styles.input, styles.textarea]} />
      <Text style={styles.label}>Prix (FCFA)</Text><TextInput testID="edit-listing-price" value={price} onChangeText={setPrice} editable={!saving} keyboardType="numeric" style={styles.input} />
    </View>
    <View style={styles.card}>
      <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Photos ({existingImages.length + newImages.length}/{MAX_IMAGES})</Text><TouchableOpacity testID="edit-listing-image-picker" accessibilityLabel="Ajouter des photos" onPress={pickImages} disabled={saving} style={styles.photoButton}><ImagePlus size={22} color={colors.primary} /></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        {existingImages.map((image, index) => <View key={`existing-${index}`} style={styles.previewWrap}><Image source={{ uri: getImageUrl(image) }} style={styles.preview} /><TouchableOpacity testID={`edit-remove-existing-${index}`} accessibilityLabel="Supprimer cette photo" onPress={() => confirmRemoveExisting(index)} style={styles.remove}><X size={15} color="#fff" /></TouchableOpacity></View>)}
        {newImages.map((image, index) => <View key={`${image.uri}-${index}`} style={styles.previewWrap}><Image source={{ uri: image.uri }} style={styles.preview} /><TouchableOpacity accessibilityLabel="Retirer la nouvelle photo" onPress={() => setNewImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} style={styles.remove}><X size={15} color="#fff" /></TouchableOpacity></View>)}
      </ScrollView>
    </View>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Localisation</Text>
      <Text style={styles.label}>Province</Text><TextInput testID="edit-listing-province" value={province} onChangeText={setProvince} editable={!saving} style={styles.input} />
      <Text style={styles.label}>Ville</Text><TextInput testID="edit-listing-city" value={city} onChangeText={setCity} editable={!saving} style={styles.input} />
      <Text style={styles.label}>Quartier ou précision</Text><TextInput testID="edit-listing-district" value={district} onChangeText={setDistrict} editable={!saving} style={styles.input} />
    </View>
    {isRealEstate ? <View style={[styles.card, styles.ownerRow]}><View style={styles.ownerCopy}><Text style={styles.label}>Vous êtes le propriétaire ?</Text><Text style={styles.helper}>Indique si le bien t’appartient directement.</Text></View><Switch testID="edit-listing-owner" value={isOwner} onValueChange={setIsOwner} disabled={saving} trackColor={{ true: colors.primary }} /></View> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TouchableOpacity testID="edit-listing-submit" accessibilityRole="button" onPress={save} disabled={saving} style={[styles.submit, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Save size={21} color="#fff" />}<Text style={styles.submitText}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }, content: { flexGrow: 1, padding: 20, paddingBottom: 48, gap: 16, backgroundColor: '#F8FAFC' }, heading: { color: colors.foreground, fontSize: 24, lineHeight: 31, fontWeight: '900' }, intro: { color: colors.mutedText, fontSize: 14, lineHeight: 20 }, card: { padding: 17, gap: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' }, label: { color: colors.foreground, fontSize: 13, fontWeight: '700' }, sectionTitle: { color: colors.foreground, fontSize: 16, fontWeight: '800' }, input: { minHeight: 48, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 11, color: colors.foreground, fontSize: 15 }, textarea: { minHeight: 120, paddingTop: 12, textAlignVertical: 'top' }, sectionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, photoButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: colors.border }, photos: { gap: 12, padding: 6 }, previewWrap: { width: 92, height: 92 }, preview: { width: 92, height: 92, borderRadius: 11, backgroundColor: '#F3F4F6' }, remove: { position: 'absolute', right: -6, top: -6, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.destructive }, ownerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, ownerCopy: { flex: 1, gap: 4 }, helper: { color: colors.mutedText, fontSize: 12 }, error: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', color: colors.destructive, backgroundColor: '#FEF2F2' }, submit: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 27, backgroundColor: colors.primary }, submitText: { color: '#fff', fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.55 },
});
