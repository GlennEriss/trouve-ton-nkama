import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, signOut } from '@react-native-firebase/auth';
import {
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Heart,
  Lock,
  LogOut,
  Phone,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
import { useUserDoc } from '../hooks/useUserDoc';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { getUserDisplayName, getUserDisplayInitial, generateColorFromName } from '../lib/userDisplay';
import { navigationRef } from '../navigation/navigationRef';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from '../navigation/types';

type MenuItem = {
  key: string;
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
};

// Reproduit /profil (variante mobile, largeur < 768) de la PWA — voir ProfilInformations.tsx,
// ProfilDetails.tsx, Logout.tsx (apps/location-maison/src/components/profil) et
// [[feedback-mobile-reuse-pwa-design]] : mêmes libellés, même ordre, mêmes icônes (lucide),
// même style de carte (fond blanc, bordure grise, coins arrondis, liste à séparateurs fins). Les
// items sans écran mobile construit pour l'instant (Devenir annonceur, Paramètre, Connexion et
// sécurité) restent présents pour la fidélité structurelle avec le web — comme "Réels"/"Publier"
// dans la barre du bas (voir MainTabParamList, types.ts) — et affichent "Bientôt disponible" au
// tap plutôt que d'être omis. "Faire de la pub" et "Mon solde" sont en revanche masqués sur
// mobile (demande explicite), pas juste des placeholders "Bientôt disponible".
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>>();
  const { isChecking } = useRequireAuth();
  const user = getAuth().currentUser;
  const { userDoc } = useUserDoc();
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Miroir du couple AvatarImage/AvatarFallback (Radix, web) : l'avatar retombe sur le cercle
  // coloré + initiale si l'image échoue à charger (URL de photo Google cassée/inaccessible,
  // constaté en pratique — écran vide sinon, RN <Image> n'affiche rien par défaut sur erreur).
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  if (isChecking) {
    return null;
  }

  const displayName = getUserDisplayName(userDoc);
  const isAnnouncer = Array.isArray(userDoc?.roles) && userDoc.roles.includes('Announcer');

  const notAvailable = (feature: string) => () =>
    Alert.alert('Bientôt disponible', `${feature} arrive prochainement.`);

  const goToFavoris = () => {
    // Favoris est un écran de premier niveau du Drawer (voir AppDrawer.tsx), pas de cet
    // écran — ProfileScreen vit dans ProfileStack > onglet Profil > Drawer, il faut donc
    // remonter jusqu'à la racine de navigation plutôt qu'un simple navigation.navigate().
    navigationRef.navigate('Main', { screen: 'Favoris' });
  };

  const menuItems: MenuItem[] = [
    ...(isAnnouncer
      ? []
      : [{ key: 'announcer', title: 'Devenir annonceur', Icon: Building2, onPress: notAvailable('Devenir annonceur') }]),
    // "Mes annonces" n'existe pas sur /profil (web) — item mobile préexistant et fonctionnel,
    // conservé volontairement (voir la note dans la revue de design) plutôt que retiré.
    { key: 'myListings', title: 'Mes annonces', Icon: ClipboardList, onPress: () => navigation.navigate('MyListings') },
    { key: 'favoris', title: 'Favoris', Icon: Heart, onPress: goToFavoris },
    {
      key: 'verifyPhone',
      title: 'Vérifier mon numéro de téléphone',
      Icon: Phone,
      onPress: () => navigation.navigate('PhoneVerify'),
    },
    { key: 'settings', title: 'Paramètre', Icon: Settings, onPress: notAvailable('Paramètre') },
    { key: 'security', title: 'Connexion et sécurité', Icon: Lock, onPress: notAvailable('Connexion et sécurité') },
    {
      key: 'privacy',
      title: 'Politique de confidentialité',
      Icon: ShieldCheck,
      onPress: () => navigation.navigate('Legal', { page: 'privacy' }),
    },
    {
      key: 'terms',
      title: "Condition d'utilisations",
      Icon: FileText,
      onPress: () => navigation.navigate('Legal', { page: 'terms' }),
    },
  ];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(getAuth());
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity testID="profile-identity-card" style={styles.identityCard} onPress={() => navigation.navigate('EditProfile')}>
          {userDoc?.image && !avatarImageFailed ? (
            <Image source={{ uri: userDoc.image }} style={styles.avatar} onError={() => setAvatarImageFailed(true)} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: generateColorFromName(displayName) }]}>
              <Text style={styles.avatarInitial}>{getUserDisplayInitial(userDoc)}</Text>
            </View>
          )}
          <View style={styles.identityText}>
            <Text style={styles.displayName} numberOfLines={1}>
              {displayName ?? user?.email ?? user?.phoneNumber ?? 'Compte'}
            </Text>
            <Text style={styles.identitySubtitle}>Modifier mes informations</Text>
          </View>
          <ChevronRight size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              testID={`profile-menu-${item.key}`}
              style={[styles.menuRow, index > 0 && styles.menuRowDivider]}
              onPress={item.onPress}
            >
              <item.Icon size={24} color={colors.foreground} />
              <Text style={styles.menuRowText}>{item.title}</Text>
              <ChevronRight size={24} color={colors.mutedText} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <>
              <LogOut size={20} color={colors.destructive} />
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 20 },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    minHeight: 80,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  identityText: { flex: 1 },
  displayName: { fontSize: 20, color: colors.foreground },
  identitySubtitle: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  menuCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  menuRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  menuRowText: { flex: 1, fontSize: 15, color: colors.foreground },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: 12,
  },
  signOutText: { color: colors.destructive, fontWeight: '600', fontSize: 15 },
});
