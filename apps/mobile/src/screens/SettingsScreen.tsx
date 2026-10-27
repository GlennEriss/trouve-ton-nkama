import React, { useRef, useState } from 'react';
import { ActivityIndicator, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, ChevronRight } from 'lucide-react-native';
import { AccountPage, accountStyles as s } from '../components/AccountPage';
import { useAppTheme } from '../theme/ThemeProvider';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useUserDoc } from '../hooks/useUserDoc';
import { notificationSettings, updateNotificationSetting, type NotificationSettingKey } from '../api/settings';
import type { ProfileStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const { isChecking } = useRequireAuth();
  const { userDoc, isLoading } = useUserDoc();
  const { mode, setMode, palette, ready } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const busy = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const save = async (key: string, operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setPending(key); setError(''); setMessage('');
    try { await operation(); setMessage('Paramètres enregistrés.'); }
    catch { setError('Impossible d’enregistrer ce paramètre. Réessayez.'); }
    finally { busy.current = false; setPending(null); }
  };
  if (isChecking) return <ActivityIndicator accessibilityLabel="Vérification de la connexion" />;
  return <AccountPage title="Paramètres">
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: palette.foreground }]}>Apparence</Text>
      <View style={[s.row, { borderColor: palette.border }]}>
        <View style={{ flex: 1 }}><Text style={[s.label, { color: palette.foreground }]}>Mode sombre</Text><Text style={[s.description, { color: palette.mutedText }]}>Activer ou désactiver le mode sombre</Text></View>
        <Switch accessibilityLabel="Activer le mode sombre" value={mode === 'dark'} disabled={!ready || !!pending} onValueChange={value => void save('theme', () => setMode(value ? 'dark' : 'light'))} />
      </View>
    </View>
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: palette.foreground }]}>Notifications</Text>
      {isLoading ? <ActivityIndicator accessibilityLabel="Chargement des paramètres" /> : !userDoc ? <Text accessibilityRole="alert" style={{ color: palette.destructive }}>Impossible de charger les paramètres du compte. Revenez sur cet écran pour réessayer.</Text> : notificationSettings.map(item => <View key={item.key} style={[s.row, { borderColor: palette.border }]}>
        <View style={{ flex: 1 }}><Text style={[s.label, { color: palette.foreground }]}>{item.title}</Text><Text style={[s.description, { color: palette.mutedText }]}>{item.description}</Text></View>
        <Switch accessibilityLabel={`Recevoir les notifications : ${item.title}`} value={userDoc.notificationParameter?.[item.key] ?? false} disabled={!!pending} onValueChange={value => void save(item.key, () => updateNotificationSetting(item.key as NotificationSettingKey, value))} />
      </View>)}
    </View>
    {pending ? <ActivityIndicator accessibilityLabel="Enregistrement en cours" /> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: palette.destructive }}>{error}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.primary }}>{message}</Text> : null}
    <TouchableOpacity accessibilityRole="button" style={[s.row, { borderColor: palette.border }]} onPress={() => navigation.navigate('Security')}>
      <Lock size={24} color={palette.foreground} /><Text style={[s.label, { flex: 1, color: palette.foreground }]}>Connexion et sécurité</Text><ChevronRight size={24} color={palette.foreground} />
    </TouchableOpacity>
  </AccountPage>;
}
