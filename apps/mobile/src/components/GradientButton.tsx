import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Reprend le dégradé exact du bouton CTA principal côté web (bg-gradient-to-b from-secondary
// to-primary, voir SigninMobileComponent.tsx:162) — composant partagé plutôt que dupliqué
// partout où ce bouton apparaît (connexion, inscription, autres CTA principaux).
export function GradientButton({ title, onPress, disabled, isLoading, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || isLoading} style={[styles.wrapper, disabled && styles.disabled, style]}>
      <LinearGradient colors={[colors.secondary, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.gradient}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 999, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
  gradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
