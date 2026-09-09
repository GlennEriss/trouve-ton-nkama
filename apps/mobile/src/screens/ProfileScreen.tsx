import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { useUserDoc } from '../hooks/useUserDoc';
import { useRequireAuth } from '../hooks/useRequireAuth';
import type { ProfileStackParamList } from '../navigation/types';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>>();
  const { isChecking } = useRequireAuth();
  const user = getAuth().currentUser;
  const { userDoc } = useUserDoc();

  if (isChecking) {
    return null;
  }

  const displayName = userDoc?.firstname ? `${userDoc.firstname} ${userDoc.lastname ?? ''}`.trim() : null;

  return (
    <SafeAreaView style={styles.container}>
      {displayName && <Text style={styles.name}>{displayName}</Text>}
      <Text style={styles.email}>{user?.email ?? user?.phoneNumber ?? 'Compte'}</Text>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EditProfile')}>
        <Text style={styles.rowText}>Modifier mon profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MyListings')}>
        <Text style={styles.rowText}>Mes annonces</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PhoneVerify')}>
        <Text style={styles.rowText}>
          {userDoc?.phoneNumberVerified ? 'Numéro vérifié ✓' : 'Vérifier mon numéro'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Legal', { page: 'terms' })}>
        <Text style={styles.rowText}>Conditions d&apos;utilisation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Legal', { page: 'privacy' })}>
        <Text style={styles.rowText}>Politique de confidentialité</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Legal', { page: 'dataDeletion' })}>
        <Text style={styles.rowText}>Suppression des données</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut(getAuth())}>
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 14, color: '#666', marginBottom: 16 },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowText: { fontSize: 16 },
  signOutButton: { marginTop: 32, alignItems: 'center', padding: 14 },
  signOutText: { color: '#dc2626', fontWeight: '600' },
});
