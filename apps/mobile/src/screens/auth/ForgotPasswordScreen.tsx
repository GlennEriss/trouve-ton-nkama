import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';

// Uniquement pertinent pour les comptes email/mot de passe — les comptes créés via téléphone
// ou Google/Facebook n'ont jamais de mot de passe (voir PhoneSignInScreen), donc rien à
// réinitialiser pour eux. Firebase Auth gère l'envoi de l'email nativement, pas besoin de
// passer par le backend Next.js.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(getAuth(), email.trim());
      setSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/invalid-email') {
        setError("L'adresse email n'est pas valide.");
      } else {
        // Volontairement le même message générique pour auth/user-not-found : ne pas révéler
        // si un email existe ou non dans la base.
        setSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Email envoyé</Text>
        <Text style={styles.subtitle}>
          Si un compte existe avec cette adresse, un email de réinitialisation vient d&apos;être envoyé.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mot de passe oublié</Text>
      <Text style={styles.subtitle}>Entrez votre email pour recevoir un lien de réinitialisation.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, (isLoading || !email.trim()) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Envoyer le lien</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', color: '#146B67' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
});
