import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from '@react-native-firebase/auth';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { useUserDoc } from '../hooks/useUserDoc';
import { toGabonWhatsappE164 } from '../lib/phone';

// Page autonome accessible depuis Profil, comme (protected)/verify-phone côté web — pas une
// étape obligatoire de l'inscription. `linkWithPhoneNumber` n'existe pas côté SDK natif (voir
// node_modules/@react-native-firebase/auth : "unsupported by the native Firebase SDKs"), donc
// on reconstruit le lien manuellement : signInWithPhoneNumber() sert uniquement à déclencher
// l'envoi du code et récupérer verificationId, puis PhoneAuthProvider.credential(...) +
// linkWithCredential() rattachent le numéro au compte email/mot de passe déjà connecté, sans
// jamais changer d'utilisateur actif.
//
// NOTE : flux non vérifiable sans appareil réel (dépend de l'envoi SMS / vérification native
// iOS-Android) — à tester lors du passage sur téléphone prévu en fin de V1.
export default function PhoneVerifyScreen() {
  const { userDoc } = useUserDoc();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<Awaited<ReturnType<typeof signInWithPhoneNumber>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    const user = getAuth().currentUser;
    if (!confirmation || !user) return;
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(confirmation.verificationId ?? '', code.trim());
      await linkWithCredential(user, credential);
      await updateDoc(doc(getFirestore(), 'users', user.uid), { phoneNumberVerified: true });
      setSuccess(true);
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code ?? '';
      if (errCode === 'auth/invalid-verification-code') {
        setError('Code invalide.');
      } else if (errCode === 'auth/credential-already-in-use') {
        setError('Ce numéro est déjà associé à un autre compte.');
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (userDoc?.phoneNumberVerified || success) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.successText}>Numéro vérifié ✓</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!confirmation ? (
        <>
          <Text style={styles.label}>Numéro de téléphone</Text>
          <TextInput style={styles.input} placeholder="074123456" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={isLoading || !phoneNumber.trim()}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Envoyer le code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>Code reçu par SMS</Text>
          <TextInput style={styles.input} placeholder="123456" keyboardType="number-pad" value={code} onChangeText={setCode} />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.button} onPress={handleConfirmCode} disabled={isLoading || code.trim().length < 4}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirmer</Text>}
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#dc2626', fontSize: 13 },
  successText: { fontSize: 18, fontWeight: '700', color: '#146B67', textAlign: 'center', marginTop: 40 },
});
