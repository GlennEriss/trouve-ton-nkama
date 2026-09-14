import React, { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { LocationOption } from '../api/algolia';

// Select "avec recherche" pour les champs de localisation (province/ville/quartier) — demande
// explicite : contrairement au <select> web (tri alphabétique suffisant, type-ahead clavier
// natif du navigateur), un tap sur mobile n'a pas d'équivalent au clavier physique pour sauter
// à une valeur — une liste de dizaines de villes gabonaises sans champ de recherche serait
// pénible à parcourir. Les options viennent toujours d'Algolia (facette sur les vraies annonces
// indexées, voir src/api/algolia.ts) — jamais une liste codée en dur.
export function LocationSelect({
  testID,
  label,
  value,
  options,
  placeholder,
  loading = false,
  disabled = false,
  onSelect,
}: {
  testID: string;
  label: string;
  value?: string;
  options: LocationOption[];
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (value: string | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedOption = options.find((o) => o.value === value);
  const isDisabled = disabled || loading;

  const open = () => {
    if (isDisabled) return;
    setQuery('');
    setIsOpen(true);
  };

  const pick = (next: string | undefined) => {
    onSelect(next);
    setIsOpen(false);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={testID}
        style={[styles.trigger, isDisabled && styles.triggerDisabled]}
        onPress={open}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${selectedOption?.label ?? placeholder}`}
      >
        <Text
          style={[styles.triggerText, !selectedOption && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {loading ? 'Chargement...' : (selectedOption?.label ?? placeholder)}
        </Text>
        <ChevronDown size={18} color={colors.mutedText} />
      </TouchableOpacity>

      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalContainer} testID={`${testID}-modal`}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity
              testID={`${testID}-modal-close`}
              onPress={() => setIsOpen(false)}
              accessibilityLabel={`Fermer la sélection ${label}`}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={colors.mutedText} />
            <TextInput
              testID={`${testID}-search-input`}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher..."
              autoFocus
            />
          </View>

          <FlatList
            testID={`${testID}-list`}
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            ListHeaderComponent={
              <TouchableOpacity testID={`${testID}-option-tout`} style={styles.option} onPress={() => pick(undefined)}>
                <Text style={styles.optionText}>Tous / Toutes</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`${testID}-option-${item.value}`}
                style={styles.option}
                onPress={() => pick(item.value)}
              >
                <Text style={[styles.optionText, item.value === value && styles.optionTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun résultat pour « {query} ».</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginTop: 14, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerDisabled: { backgroundColor: '#F3F4F6' },
  triggerText: { fontSize: 15, color: colors.foreground, flex: 1 },
  triggerPlaceholder: { color: colors.mutedText },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.foreground },
  option: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 15, color: colors.foreground },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.mutedText, marginTop: 24, fontSize: 14 },
});
