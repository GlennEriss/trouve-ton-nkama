import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from './ScreenHeader';
import { useAppTheme } from '../theme/ThemeProvider';

export function AccountPage({ title, children }: { title: string; children: React.ReactNode }) {
  const navigation = useNavigation();
  const { palette } = useAppTheme();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: palette.surface }}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={accountStyles.content}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export const accountStyles = StyleSheet.create({
  content: { padding: 24, gap: 24, width: '100%', maxWidth: 896, alignSelf: 'center', flexGrow: 1 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 18, fontWeight: '600' },
  description: { fontSize: 14, lineHeight: 21, marginTop: 4 },
  button: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
});
