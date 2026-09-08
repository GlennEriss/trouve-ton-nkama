import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerToggleButton } from '@react-navigation/drawer';
import type { DrawerHeaderProps } from '@react-navigation/drawer';
import { Search, Bell, UserCircle } from 'lucide-react-native';
import { useAuthState } from '../hooks/useAuthState';
import { navigationRef } from './navigationRef';
import { colors } from '../theme/colors';
import { Logo } from '../components/Logo';

// Reprend la structure exacte de home-page/Navbar.tsx (web, variante mobile) : hamburger ->
// logo + wordmark -> bouton recherche -> "Se connecter" (déconnecté) ou notifications + avatar
// (connecté) — voir [[feedback-mobile-reuse-pwa-design]].
export function AppHeader(_props: DrawerHeaderProps) {
  const { user } = useAuthState();

  const openSearch = () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', { screen: 'MainTabs', params: { screen: 'Recherche' } });
  };

  const openNotifications = () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', { screen: 'Notifications' });
  };

  const openProfile = () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', { screen: 'MainTabs', params: { screen: 'ProfilOuConnexion' } });
  };

  const openSignIn = () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('SignIn');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.row}>
        <DrawerToggleButton tintColor={colors.foreground} />

        <View style={styles.brand}>
          <Logo size={28} />
          {/* Empilement délibéré sur 3 lignes (Navbar.tsx web, variante mobile, lignes
              103-115) — pas un retour à la ligne accidentel : 3 <span> séparés, text-xs
              font-black, dans une colonne étroite à côté du logo. */}
          <View style={styles.wordmarkColumn}>
            <Text style={styles.wordmark}>Trouve</Text>
            <Text style={styles.wordmark}>Ton</Text>
            <Text style={styles.wordmark}>Nkama</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={openSearch} style={styles.iconButton} accessibilityLabel="Rechercher">
            <Search color={colors.foreground} size={22} />
          </TouchableOpacity>

          {user ? (
            <>
              <TouchableOpacity onPress={openNotifications} style={styles.iconButton} accessibilityLabel="Notifications">
                <Bell color={colors.foreground} size={22} />
              </TouchableOpacity>
              <TouchableOpacity onPress={openProfile} style={styles.iconButton} accessibilityLabel="Profil">
                <UserCircle color={colors.primary} size={24} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={openSignIn} style={styles.signInButton}>
              <Text style={styles.signInText}>Se connecter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  wordmarkColumn: { justifyContent: 'center' },
  wordmark: { fontSize: 11, fontWeight: '900', color: colors.primary, lineHeight: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { padding: 8 },
  signInButton: { paddingHorizontal: 14, paddingVertical: 8 },
  signInText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
