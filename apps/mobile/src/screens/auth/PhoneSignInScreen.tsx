import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { toGabonWhatsappE164 } from '../../lib/phone';
import type { RootStackParamList } from '../../navigation/types';

// Connexion pour les comptes créés côté web sans mot de passe (OTP téléphone ou Google/
// Facebook, voir phone-auth.service.ts : "Passwordless: no password is ever set for phone
// accounts") — SignInScreen (email/mdp) les laissait bloqués dehors. Contrairement à
// PhoneVerifyScreen (qui RATTACHE un numéro à un compte déjà connecté via linkWithCredential),
// ici on se CONNECTE directement avec confirmation.confirm(code) : Firebase Auth retrouve le
// même uid que celui créé sur le web, car le fournisseur "phone" y est déjà associé à ce
// numéro. Pas de création de compte ici (ça reste le rôle du formulaire d'inscription complet,
// voir SignUpScreen) — un numéro inconnu du tout est délibérément rejeté ci-dessous.
export default function PhoneSignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'PhoneSignIn'>>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<Awaited<ReturnType<typeof signInWithPhoneNumber>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setError(null);
    const e164 = toGabonWhatsappE164(phoneNumber.trim());
    if (!e164.startsWith('+')) {
      setError('Numéro invalide.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signInWithPhoneNumber(getAuth(), e164);
      setConfirmation(result);
    } catch {
      setError("Impossible d'envoyer le code. Vérifiez le numéro et réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCode = async () => {
    setError(null);
    if (!confirmation) return;
    setIsLoading(true);
    try {
      const credential = await confirmation.confirm(code.trim());
      const uid = credential?.user.uid;
      if (!uid) throw new Error('no-uid');

      const userDoc = await getDoc(doc(getFirestore(), 'users', uid));
      if (!userDoc.exists()) {
        await signOut(getAuth());
        setError("Aucun compte n'est associé à ce numéro. Créez un compte avec un email pour l'instant.");
        return;
      }
      // Main est toujours monté sous cette modal (voir RootStackParamList) — refermer
      // explicitement pour révéler l'onglet qui affichera son contenu désormais déverrouillé.
      navigation.goBack();
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code ?? '';
      if (errCode === 'auth/invalid-verification-code') {
        setError('Code invalide.');
      } else if (errCode === 'auth/code-expired') {
        setError('Ce code a expiré. Renvoyez-en un nouveau.');
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion par téléphone</Text>

      {!confirmation ? (
        <>
          <Text style={styles.subtitle}>Pour les comptes créés par numéro de téléphone ou via Google/Facebook.</Text>
          <TextInput
            style={styles.input}
            placeholder="074123456"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.button, (isLoading || !phoneNumber.trim()) && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={isLoading || !phoneNumber.trim()}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Envoyer le code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Code reçu par SMS</Text>
          <TextInput style={styles.input} placeholder="123456" keyboardType="number-pad" value={code} onChangeText={setCode} />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.button, (isLoading || code.trim().length < 4) && styles.buttonDisabled]}
            onPress={handleConfirmCode}
            disabled={isLoading || code.trim().length < 4}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmer</Text>}
          </TouchableOpacity>
        </>
      )}
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
