import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Home, Search, Plus, Video, UserCircle } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import PublishScreen from '../screens/PublishScreen';
import ReelsScreen from '../screens/ReelsScreen';
import { SearchStack } from './SearchStack';
import { ProfileStack } from './ProfileStack';
import { useFcmToken } from '../hooks/useFcmToken';
import { useAuthState } from '../hooks/useAuthState';
import { requireAuthOrRedirect } from '../lib/authGuard';
import { colors } from '../theme/colors';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Reprend la structure exacte de BottomNavigation.tsx (web, état non-annonceur) : 5 items +
// bouton central "Publier" surélevé, en cercle plein, plus grand que les autres icônes — voir
// [[feedback-mobile-reuse-pwa-design]] et la note détaillée dans types.ts (MainTabParamList).
function PublishTabButton(props: BottomTabBarButtonProps) {
  const { children, onPress, style, testID } = props;
  return (
    // `style` (fourni par le Tab.Navigator) porte le flex:1 qui donne à cet onglet la même
    // largeur que les 4 autres — l'omettre (bug précédent) cassait la symétrie de la barre :
    // le bouton "Publier" n'occupait que sa taille intrinsèque au lieu d'un cinquième de la
    // largeur, décalant tout le reste. Appliqué au conteneur extérieur ; le cercle surélevé
    // (taille fixe, `top` négatif) reste un enfant centré dedans.
    <TouchableOpacity
      testID={testID}
      style={[style, styles.publishButtonWrapper]}
      onPress={(e) => {
        // "Publier" nécessite un compte même une fois construit (V1.1) — cohérent avec les
        // autres actions protégées (favoris, demandes), voir authGuard.ts.
        if (!requireAuthOrRedirect()) return;
        onPress?.(e);
      }}
    >
      <View style={styles.publishButton}>{children}</View>
    </TouchableOpacity>
  );
}

export function MainTabs() {
  // Enregistré ici (racine post-authentification) plutôt que dans App.tsx : n'a de sens que
  // pour un utilisateur connecté (voir useFcmToken.ts, qui lit getAuth().currentUser).
  useFcmToken();
  const { user } = useAuthState();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{ tabBarButtonTestID: 'tab-accueil', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Recherche"
        component={SearchStack}
        options={{ tabBarButtonTestID: 'tab-recherche', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Publier"
        component={PublishScreen}
        options={{
          tabBarButtonTestID: 'tab-publier',
          tabBarIcon: () => <Plus color="#fff" size={26} />,
          tabBarButton: (props) => <PublishTabButton {...props} />,
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{ tabBarButtonTestID: 'tab-reels', tabBarLabel: 'Réels', tabBarIcon: ({ color, size }) => <Video color={color} size={size} /> }}
      />
      <Tab.Screen
        name="ProfilOuConnexion"
        component={ProfileStack}
        options={{
          tabBarButtonTestID: 'tab-connexion',
          tabBarLabel: user ? 'Profil' : 'Connexion',
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  publishButtonWrapper: { alignItems: 'center', justifyContent: 'center' },
  publishButton: {
    top: -22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 4,
    borderColor: '#fff',
  },
});
