import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../theme/colors';

export type ChipOption = { id: string; label: string };

// Repli des sous-catégories (Mode : 5 pills, Immobilier : 13) — demande explicite : elles
// prenaient trop de place ouvertes en permanence. Fermé par défaut, affiche juste la sélection
// courante ; on ouvre, on choisit, ça se referme tout seul.
export function ChipExpander({
  label,
  allLabel,
  options,
  selectedId,
  onSelect,
  pillTestID,
}: {
  label: string;
  allLabel: string;
  options: ChipOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  // Préfixe de testID pour chaque pill : `${pillTestID}-${id}` (et `${pillTestID}-tout` pour
  // l'option "tout").
  pillTestID: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedLabel = options.find((o) => o.id === selectedId)?.label ?? allLabel;

  const pick = (id: string) => {
    onSelect(id);
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="subcategory-toggle"
        style={styles.toggle}
        onPress={() => setExpanded((v) => !v)}
        accessibilityLabel={`${label} : ${selectedLabel}`}
      >
        <Text style={styles.toggleLabel}>{label} :</Text>
        <Text style={styles.toggleValue} numberOfLines={1}>{selectedLabel}</Text>
        {expanded ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.pillsRow}>
          <TouchableOpacity
            testID={`${pillTestID}-tout`}
            style={[styles.pill, !selectedId && styles.pillActive]}
            onPress={() => pick('')}
          >
            <Text style={[styles.pillText, !selectedId && styles.pillTextActive]}>{allLabel}</Text>
          </TouchableOpacity>
          {options.map((option) => {
            const isActive = option.id === selectedId;
            return (
              <TouchableOpacity
                key={option.id}
                testID={`${pillTestID}-${option.id}`}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => pick(option.id)}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toggleLabel: { fontSize: 13, color: colors.mutedText },
  toggleValue: { fontSize: 13, fontWeight: '700', color: colors.foreground, maxWidth: 180 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
});
