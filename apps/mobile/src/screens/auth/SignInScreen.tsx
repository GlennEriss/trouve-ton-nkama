import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Apple, Phone } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { GradientButton } from '../../components/GradientButton';

function mapSignInError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-email' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email ou mot de passe incorrect.';
  }
  if (code === 'auth/user-not-found') {
    return 'Aucun compte ne correspond à cet email.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  return 'Impossible de se connecter. Vérifiez vos identifiants.';
}

// Logo Google officiel repris tel quel de SigninMobileComponent.tsx (web), voir
// [[feedback-mobile-reuse-pwa-design]] : mêmes 4 paths/couleurs, juste svg -> react-native-svg.
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

// Copie et mise en page reprises telles quelles de SigninMobileComponent.tsx (web) — voir
// [[feedback-mobile-reuse-pwa-design]] : ne jamais réinventer un style/texte quand un
// équivalent existe déjà sur la PWA.
export default function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SignIn'>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(getAuth(), email.trim(), password);
      // Contrairement à l'ancien AuthStack (bascule automatique gérée par RootNavigator), Main
      // est maintenant toujours monté en dessous de cette modal — il faut la refermer
      // explicitement pour révéler l'onglet qui affichera son contenu désormais déverrouillé.
      navigation.goBack();
    } catch (err) {
      setError(mapSignInError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="screen-connexion">
      <Text style={styles.title}>Bienvenue sur Trouve Ton Nkama !</Text>
      <Text style={styles.subtitle}>Connectez-vous pour retrouver vos annonces, favoris et paramètres de compte.</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Saisissez votre email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        placeholder="Saisissez votre mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <GradientButton
        title="Connexion"
        onPress={handleSignIn}
        isLoading={isLoading}
        disabled={!email.trim() || !password}
        style={styles.primaryButton}
      />

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.linkText}>Mot de passe oublié?</Text>
      </TouchableOpacity>

      <View style={styles.separatorRow}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>OU</Text>
        <View style={styles.separatorLine} />
      </View>

      <TouchableOpacity
        style={styles.outlineButton}
        disabled={isLoading}
        onPress={() => Alert.alert('Bientôt disponible', 'La connexion avec Google arrive prochainement.')}
      >
        <GoogleLogo />
        <Text style={styles.outlineButtonText}>Continuer avec Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.outlineButton}
          disabled={isLoading}
          onPress={() => Alert.alert('Bientôt disponible', 'La connexion avec Apple arrive prochainement.')}
        >
          <Apple size={20} color={colors.foreground} fill={colors.foreground} />
          <Text style={styles.outlineButtonText}>Continuer avec Apple</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.outlineButton} disabled={isLoading} onPress={() => navigation.navigate('PhoneSignIn')}>
        <Phone size={18} color={colors.secondary} />
        <Text style={styles.outlineButtonText}>Continuer avec Numéro de téléphone</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Vous n&apos;avez pas de compte?{' '}
          <Text style={styles.footerLink} onPress={() => navigation.navigate('SignUp')}>
            S&apos;enregistrer
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.mutedText, marginTop: 6, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16 },
  error: { color: colors.destructive, fontSize: 13, textAlign: 'center', marginTop: 12 },
  primaryButton: { marginTop: 20 },
  linkButton: { alignItems: 'center', padding: 10, marginTop: 4 },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { marginHorizontal: 12, color: colors.primary, fontWeight: '600', fontSize: 12 },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 12,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  footer: { marginTop: 24, alignItems: 'center' },
  footerText: { fontSize: 14, color: colors.mutedText, textAlign: 'center' },
  footerLink: { color: colors.primary, fontWeight: '600' },
});
