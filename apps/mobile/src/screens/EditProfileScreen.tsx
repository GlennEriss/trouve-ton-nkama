import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { useUserDoc } from '../hooks/useUserDoc';

// Édition minimale (prénom/nom uniquement) — pas de photo de profil en V1, ça demanderait
// expo-image-picker + un upload Firebase Storage, hors scope pour l'instant.
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { userDoc, isLoading } = useUserDoc();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userDoc) {
      setFirstname(userDoc.firstname ?? '');
      setLastname(userDoc.lastname ?? '');
    }
  }, [userDoc]);

  const handleSave = async () => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !firstname.trim() || !lastname.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await updateDoc(doc(getFirestore(), 'users', uid), {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
      });
      navigation.goBack();
    } catch {
      setError('Impossible d’enregistrer. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#146B67" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Prénom</Text>
      <TextInput style={styles.input} value={firstname} onChangeText={setFirstname} />

      <Text style={styles.label}>Nom</Text>
      <TextInput style={styles.input} value={lastname} onChangeText={setLastname} />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, (isSaving || !firstname.trim() || !lastname.trim()) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving || !firstname.trim() || !lastname.trim()}
      >
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enregistrer</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16 },
  button: { backgroundColor: '#146B67', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: '#dc2626', fontSize: 13, textAlign: 'center' },
});
