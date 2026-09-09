import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from '@react-native-firebase/firestore';
import { buildNewUserDocument, isValidBirthDate } from '../../lib/firestoreUser';
import type { RootStackParamList } from '../../navigation/types';

// Miroir de auth.service.ts (web) : mêmes vérifications d'unicité (téléphone, email) avant
// de créer le compte Firebase Auth, même document Firestore ensuite — un compte créé ici
// est identique à un compte créé sur le site. Formulaire volontairement condensé (un seul
// écran, pas l'assistant multi-étapes du web) pour la V1.
export default function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SignUp'>>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 8 &&
    phoneNumber.trim() &&
    isValidBirthDate(birthDate.trim()) &&
    acceptTerms;

  const handleSignUp = async () => {
    setError(null);

    if (!isValidBirthDate(birthDate.trim())) {
      setError('Date de naissance invalide, ou vous avez moins de 18 ans (format AAAA-MM-JJ).');
      return;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }

    setIsLoading(true);
    try {
      const db = getFirestore();
      const usersRef = collection(db, 'users');

      const byPhone = await getDocs(query(usersRef, where('phoneNumbers', 'array-contains', phoneNumber.trim())));
      if (!byPhone.empty) {
        setError('Ce numéro de téléphone est déjà utilisé.');
        return;
      }
      const byEmail = await getDocs(query(usersRef, where('email', '==', email.trim())));
      if (!byEmail.empty) {
        setError('Cette adresse email est déjà utilisée.');
        return;
      }

      const credential = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
      const uid = credential.user.uid;

      const newUser = buildNewUserDocument(uid, {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      await setDoc(doc(db, 'users', uid), newUser);
      // Main est toujours monté sous cette modal (voir RootStackParamList) — refermer
      // explicitement pour révéler l'onglet qui affichera son contenu désormais déverrouillé.
      navigation.goBack();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée.');
      } else if (code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible (8 caractères minimum).');
      } else if (code === 'auth/invalid-email') {
        setError("L'adresse email n'est pas valide.");
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer un compte</Text>

        <View style={styles.row}>
          <TextInput style={[styles.input, styles.half]} placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
          <TextInput style={[styles.input, styles.half]} placeholder="Nom" value={lastName} onChangeText={setLastName} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe (8 caractères minimum)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone (ex: 074123456)"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Date de naissance (AAAA-MM-JJ)"
          value={birthDate}
          onChangeText={setBirthDate}
        />

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setAcceptTerms((v) => !v)}>
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>J&apos;accepte les conditions d&apos;utilisation</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, (!canSubmit || isLoading) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer mon compte</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#146B67', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#999' },
  checkboxChecked: { backgroundColor: '#146B67', borderColor: '#146B67' },
  checkboxLabel: { flex: 1, fontSize: 14 },
  button: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
});
