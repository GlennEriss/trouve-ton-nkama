import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createSearchRequest, listSearchRequests, type SearchRequestListItem } from '../api/searchRequests';
import { requireAuthOrRedirect } from '../lib/authGuard';

// Types réduits pour ce formulaire condensé (V1 mobile), même logique que la simplification
// choisie pour la création d'annonce — la liste complète (14 types) reste sur le web.
const PROPERTY_TYPES: Array<{ key: string; label: string }> = [
  { key: 'Home', label: 'Maison' },
  { key: 'Apartment', label: 'Appartement' },
  { key: 'Studio', label: 'Studio' },
  { key: 'Room', label: 'Chambre' },
  { key: 'Villa', label: 'Villa' },
  { key: 'Land', label: 'Terrain' },
];

function formatBudget(min: number, max: number): string {
  return `${min.toLocaleString('fr-FR')} - ${max.toLocaleString('fr-FR')} FCFA`;
}

function RequestRow({ item }: { item: SearchRequestListItem }) {
  const typeLabel = PROPERTY_TYPES.find((t) => t.key === item.typeProperty)?.label ?? item.typeProperty;
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowType}>{typeLabel}</Text>
        <Text style={styles.rowTransaction}>{item.transactionType === 'FOR_RENT' ? 'À louer' : 'À acheter'}</Text>
      </View>
      <Text style={styles.rowLocation}>{[item.neighborhood, item.city, item.province].filter(Boolean).join(', ')}</Text>
      <Text style={styles.rowBudget}>{formatBudget(item.budgetMinXaf, item.budgetMaxXaf)}</Text>
      <Text style={styles.rowDescription} numberOfLines={3}>{item.description}</Text>
    </View>
  );
}

function CreateRequestModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [typeProperty, setTypeProperty] = useState('Home');
  const [transactionType, setTransactionType] = useState<'FOR_RENT' | 'FOR_SALE'>('FOR_RENT');
  const [province, setProvince] = useState('Estuaire');
  const [city, setCity] = useState('Libreville');
  const [neighborhood, setNeighborhood] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [description, setDescription] = useState('');
  const [whatsappContact, setWhatsappContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = city.trim() && Number(budgetMax) > 0 && description.trim().length >= 10 && whatsappContact.trim();

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await createSearchRequest({
        typeProperty,
        transactionType,
        province: province.trim(),
        city: city.trim(),
        neighborhood: neighborhood.trim() || undefined,
        budgetMinXaf: 0,
        budgetMaxXaf: Number(budgetMax),
        description: description.trim(),
        whatsappContact: whatsappContact.trim(),
      });
      onCreated();
      onClose();
    } catch {
      setError('Impossible de publier la demande. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Publier une demande</Text>
          <Text style={styles.modalSubtitle}>Gratuit pour le lancement de l&apos;app 🎉 — validée par notre équipe avant publication.</Text>

          <Text style={styles.label}>Type de bien</Text>
          <View style={styles.pillsRow}>
            {PROPERTY_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.pill, typeProperty === t.key && styles.pillActive]}
                onPress={() => setTypeProperty(t.key)}
              >
                <Text style={[styles.pillText, typeProperty === t.key && styles.pillTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Location ou vente</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={[styles.pill, transactionType === 'FOR_RENT' && styles.pillActive]}
              onPress={() => setTransactionType('FOR_RENT')}
            >
              <Text style={[styles.pillText, transactionType === 'FOR_RENT' && styles.pillTextActive]}>Location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, transactionType === 'FOR_SALE' && styles.pillActive]}
              onPress={() => setTransactionType('FOR_SALE')}
            >
              <Text style={[styles.pillText, transactionType === 'FOR_SALE' && styles.pillTextActive]}>Vente</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Ville</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />

          <Text style={styles.label}>Quartier (optionnel)</Text>
          <TextInput style={styles.input} value={neighborhood} onChangeText={setNeighborhood} placeholder="Ex: Nzeng-Ayong" />

          <Text style={styles.label}>Budget maximum (FCFA)</Text>
          <TextInput style={styles.input} value={budgetMax} onChangeText={setBudgetMax} keyboardType="numeric" placeholder="Ex: 150000" />

          <Text style={styles.label}>Décrivez ce que vous cherchez</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Ex: Je cherche une maison 2 chambres proche du centre-ville..."
          />

          <Text style={styles.label}>Votre numéro WhatsApp</Text>
          <TextInput style={styles.input} value={whatsappContact} onChangeText={setWhatsappContact} keyboardType="phone-pad" placeholder="074 XX XX XX" />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitButton, (!canSubmit || isSubmitting) && styles.buttonDisabled]}
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Publier ma demande</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function SearchRequestsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['search-requests'],
    queryFn: listSearchRequests,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="screen-search-requests">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Demandes de recherche</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => requireAuthOrRedirect() && setIsModalVisible(true)}>
          <Text style={styles.newButtonText}>+ Publier</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#146B67" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RequestRow item={item} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune demande pour l&apos;instant.</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      <CreateRequestModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['search-requests'] })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  newButton: { backgroundColor: '#146B67', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  newButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#666', fontSize: 14 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowType: { fontSize: 15, fontWeight: '700', color: '#146B67' },
  rowTransaction: { fontSize: 12, color: '#666' },
  rowLocation: { fontSize: 13, color: '#444' },
  rowBudget: { fontSize: 14, fontWeight: '700' },
  rowDescription: { fontSize: 13, color: '#555', marginTop: 2 },
  modalContent: { padding: 20, gap: 4 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, fontSize: 15 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: '#146B67', borderColor: '#146B67' },
  pillText: { fontSize: 13, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 12, textAlign: 'center' },
  submitButton: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelButton: { alignItems: 'center', padding: 12 },
  cancelButtonText: { color: '#666', fontSize: 14 },
});
