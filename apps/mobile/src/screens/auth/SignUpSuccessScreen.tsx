import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';
import { apiFetch } from '../../api/client';
import { colors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';

const RESEND_COOLDOWN_SECONDS = 60;

// Miroir de RegisterSuccess.tsx (web) : même message, mêmes deux actions ("Vérifier le
// statut" / "Renvoyer l'email", même endpoints + cooldown de 60s), même lien de sortie —
// adapté pour fermer la pile d'auth (goBack vers Main, déjà connecté via Firebase Auth suite à
// createUserWithEmailAndPassword) plutôt que router.push('/signin') comme sur le web.
export default function SignUpSuccessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SignUpSuccess'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SignUpSuccess'>>();
  const { uid } = route.params;

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const data = await apiFetch<{ emailVerified: boolean }>('/api/verify-email', {
        method: 'POST',
        body: { uid },
      });
      setEmailVerified(data.emailVerified);
    } catch {
      // Silencieux, comme côté web : juste un log là-bas, pas de blocage utilisateur ici.
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      await apiFetch('/api/auth/send-verification-email', { method: 'POST', body: { uid } });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      // Silencieux également — l'utilisateur peut retenter via le bouton.
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container} testID="screen-signup-success">
      <View style={styles.iconCircle}>
        <Mail size={32} color={colors.success} />
      </View>
      <Text style={styles.title}>Inscription réussie !</Text>
      <Text style={styles.subtitle}>
        Un email de confirmation a été envoyé à votre adresse email. Cliquez sur le lien dans l&apos;email pour
        activer votre compte.
      </Text>

      {emailVerified !== null && (
        <View style={[styles.statusBox, emailVerified ? styles.statusBoxVerified : styles.statusBoxPending]}>
          <Text style={[styles.statusText, emailVerified ? styles.statusTextVerified : styles.statusTextPending]}>
            {emailVerified
              ? '✅ Votre email a été vérifié ! Vous pouvez maintenant vous connecter.'
              : "⏳ Votre email n'est pas encore vérifié. Vérifiez votre boîte de réception."}
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.outlineButton} onPress={handleCheckStatus} disabled={isCheckingStatus}>
        {isCheckingStatus ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.outlineButtonText}>Vérifier le statut</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.outlineButton}
        onPress={handleResendEmail}
        disabled={isResending || cooldown > 0}
      >
        {isResending ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.outlineButtonText}>
            {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer l'email"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          // Main est toujours monté sous cette modal (voir RootStackParamList) — SignUpSuccess
          // est empilé par-dessus SignUp lui-même empilé par-dessus Main sur CE MÊME stack
          // (SignUpSuccess n'est pas nichée dans un navigateur enfant, donc getParent() ici
          // vaut undefined : un simple goBack() ne referait remonter que jusqu'à SignUp, pas
          // jusqu'à Main). popToTop() vide toute la pile d'un coup pour révéler l'app, déjà
          // connectée (Firebase Auth a une session active depuis createUserWithEmailAndPassword
          // dans SignUpScreen).
          navigation.popToTop();
        }}
      >
        <Text style={styles.primaryButtonText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', alignItems: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.mutedText, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  statusBox: { borderRadius: 12, padding: 14, marginBottom: 16, width: '100%' },
  statusBoxVerified: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  statusBoxPending: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  statusText: { fontSize: 13, fontWeight: '600' },
  statusTextVerified: { color: '#166534' },
  statusTextPending: { color: '#9A3412' },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
