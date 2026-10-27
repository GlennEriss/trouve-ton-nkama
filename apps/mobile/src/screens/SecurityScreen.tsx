import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { AccountPage, accountStyles as s } from '../components/AccountPage';
import { useAppTheme } from '../theme/ThemeProvider';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useUserDoc } from '../hooks/useUserDoc';
import { navigationRef } from '../navigation/navigationRef';
import { linkAccountProvider, securityErrorMessage, type AccountProvider } from '../lib/accountSecurity';
import { GoogleSignInCancelledError } from '../lib/googleAuth';
import { facebookLinkingEnabled } from '../lib/facebookAuth';

export default function SecurityScreen() {
  const { user, isChecking } = useRequireAuth();
  const { userDoc, isLoading } = useUserDoc();
  const { palette } = useAppTheme();
  const [provider, setProvider] = useState<AccountProvider | null>(null);
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [linked, setLinked] = useState<AccountProvider[]>([]);
  const text = { color: palette.foreground };
  const button = [s.button, { borderColor: palette.border, opacity: pending ? 0.5 : 1 }];
  const close = () => { if (!busy.current) { setProvider(null); setPassword(''); setVisible(false); setError(''); } };
  const associate = async (method: AccountProvider, secret?: string) => {
    if (busy.current) return;
    if (provider && !secret?.trim()) { setError('Veuillez entrer votre mot de passe.'); return; }
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const result = await linkAccountProvider(method, secret);
      setLinked(previous => [...previous, method]);
      setProvider(null); setPassword(''); setVisible(false);
      setMessage(result.notificationSent ? 'Méthode de connexion associée.' : 'Méthode associée. La notification de sécurité n’a pas pu être envoyée.');
    } catch (err) {
      if (err instanceof GoogleSignInCancelledError) { setProvider(null); setPassword(''); }
      else setError(securityErrorMessage(err));
    } finally { busy.current = false; setPending(false); }
  };
  const start = (method: AccountProvider) => {
    setError(''); setMessage('');
    if (user?.providerData.some(item => item.providerId === 'password')) { setPassword(''); setProvider(method); }
    else void associate(method);
  };
  if (isChecking) return <ActivityIndicator accessibilityLabel="Vérification de la connexion" />;
  const methods: AccountProvider[] = facebookLinkingEnabled ? ['GOOGLE', 'FACEBOOK'] : ['GOOGLE'];
  return <AccountPage title="Connexion et sécurité">
    <View style={s.section}>
      <Text style={[s.sectionTitle, text]}>Méthodes de connexion</Text>
      <Text style={[s.description, { color: palette.mutedText }]}>Associez une méthode supplémentaire pour accéder plus facilement à votre compte.</Text>
      {isLoading ? <ActivityIndicator accessibilityLabel="Chargement du compte" /> : methods.map(method => {
        const connected = linked.includes(method) || !!user?.providerData.some(item => item.providerId === (method === 'GOOGLE' ? 'google.com' : 'facebook.com'));
        // Firestore mirror must also be synced: allow retry if Firebase linking succeeded alone.
        const synced = connected && (linked.includes(method) || userDoc?.providers?.includes(method));
        return <View key={method} style={[s.section, { paddingVertical: 16, borderBottomWidth: 1, borderColor: palette.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Lock size={24} color={palette.foreground} /><View style={{ flex: 1 }}><Text style={[s.label, text]}>{method === 'GOOGLE' ? 'Google' : 'Facebook'}</Text><Text style={[s.description, { color: connected ? palette.primary : palette.mutedText }]}>{connected ? 'Connecté' : 'Non connecté'}</Text></View></View>
          <TouchableOpacity accessibilityRole="button" disabled={pending || !!synced} style={[button, synced && { opacity: 0.5 }]} onPress={() => start(method)}><Text style={text}>{synced ? 'Déjà associé' : connected ? 'Finaliser l’association' : 'Associer'}</Text></TouchableOpacity>
        </View>;
      })}
    </View>
    {pending ? <ActivityIndicator accessibilityLabel="Association en cours" /> : null}
    {error && !provider ? <Text accessibilityRole="alert" style={{ color: palette.destructive }}>{error}</Text> : null}
    {message ? <Text accessibilityLiveRegion="polite" style={{ color: palette.primary }}>{message}</Text> : null}
    <View style={s.section}>
      <Text style={[s.sectionTitle, text]}>Mot de passe</Text>
      <Text style={[s.description, { color: palette.mutedText }]}>Renouvelez votre mot de passe en cas de doute ou par précaution.</Text>
      <TouchableOpacity accessibilityRole="button" disabled={pending} style={button} onPress={() => navigationRef.navigate('ForgotPassword')}><Text style={text}>Mettre à jour</Text></TouchableOpacity>
    </View>
    <Modal visible={provider !== null} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.surface }}>
        <AccountPasswordContent title="Confirmez votre mot de passe">
          <Text style={[s.description, { color: palette.mutedText }]}>Pour lier un compte supplémentaire, veuillez entrer votre mot de passe pour vérification.</Text>
          <Text style={text}>Mot de passe</Text>
          <TextInput accessibilityLabel="Mot de passe" placeholder="Entrez votre mot de passe" placeholderTextColor={palette.mutedText} style={[s.input, text, { borderColor: palette.border }]} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" value={password} onChangeText={setPassword} editable={!pending} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={button} onPress={() => setVisible(value => !value)}>{visible ? <EyeOff color={palette.foreground} /> : <Eye color={palette.foreground} />}</TouchableOpacity>
          {error ? <Text accessibilityRole="alert" style={{ color: palette.destructive }}>{error}</Text> : null}
          <TouchableOpacity accessibilityRole="button" disabled={pending} style={button} onPress={() => provider && void associate(provider, password)}>{pending ? <ActivityIndicator /> : <Text style={text}>Confirmer</Text>}</TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={pending} style={button} onPress={close}><Text style={text}>Annuler</Text></TouchableOpacity>
        </AccountPasswordContent>
      </SafeAreaView>
    </Modal>
  </AccountPage>;
}

function AccountPasswordContent({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useAppTheme();
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}><Text style={[s.sectionTitle, { color: palette.foreground }]}>{title}</Text>{children}</ScrollView></KeyboardAvoidingView>;
}
