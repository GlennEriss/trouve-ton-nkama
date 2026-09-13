import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { X, ClipboardList, FileText, Home, Shield, Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Logo } from '../components/Logo';
import type { DrawerParamList } from './types';

// Écart volontaire et explicite par rapport à MobileSidebar.tsx (web), demandé par l'utilisateur :
// contrairement au web (aucun lien n'y dépend de la route courante — voir l'historique dans
// [[feedback-mobile-reuse-pwa-design]]), chaque lien ici passe en vert uniquement lorsqu'on est
// sur sa propre page, gris sinon — y compris "Demandes de recherche", qui n'est plus vert par
// défaut. Favoris n'existe pas dans SIDEBAR_LINKS côté web (accessible depuis la barre du bas
// une fois connecté à la place) — retiré, ne pas réinventer. Les items purement SEO/blog du web
// (Blog, Guide Immobilier, Maisons à louer/vendre, Publicité, Conditions annonceur) restent hors
// du scope V1 mobile. "Suppression des données" (conformité App Store/Play Store) n'a pas
// d'équivalent dans SIDEBAR_LINKS mais reste ici volontairement.
type LegalPage = 'terms' | 'privacy' | 'dataDeletion';

function getActiveRoute(
  state: DrawerContentComponentProps['state'],
): { name: keyof DrawerParamList; page?: LegalPage; tab?: string } {
  const route = state.routes[state.index];
  if (route.name === 'Legal') {
    const params = route.params as DrawerParamList['Legal'] | undefined;
    return { name: 'Legal', page: params?.page };
  }
  if (route.name === 'MainTabs') {
    // route.state n'existe qu'une fois la pile d'onglets déjà initialisée (après une première
    // navigation dedans) ; tant que ce n'est pas le cas, le premier onglet (Accueil, voir
    // MainTabs.tsx) est celui actif par défaut.
    const tabState = route.state as { routes: Array<{ name: string }>; index: number } | undefined;
    const activeTab = tabState?.routes[tabState.index]?.name ?? 'Accueil';
    return { name: 'MainTabs', tab: activeTab };
  }
  return { name: route.name as keyof DrawerParamList };
}

export function AppDrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const active = getActiveRoute(state);
  const isAccueilActive = active.name === 'MainTabs' && active.tab === 'Accueil';
  const isSearchRequestsActive = active.name === 'SearchRequests';
  const isLegalActive = (page: LegalPage) => active.name === 'Legal' && active.page === page;

  const close = () => navigation.closeDrawer();
  const goAccueil = () => {
    navigation.navigate('MainTabs', { screen: 'Accueil' });
    close();
  };
  const goSearchRequests = () => {
    navigation.navigate('SearchRequests');
    close();
  };
  const goLegal = (page: LegalPage) => {
    navigation.navigate('Legal', { page });
    close();
  };

  return (
    <SafeAreaView style={styles.container} testID="drawer-content">
      <View style={styles.header}>
        <View style={styles.brand}>
          <Logo size={30} />
          <Text style={styles.wordmark}>Trouve Ton Nkama</Text>
        </View>
        <TouchableOpacity testID="drawer-close" onPress={close} accessibilityLabel="Fermer le menu">
          <X color={colors.foreground} size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.nav}>
        <TouchableOpacity
          testID="drawer-link-accueil"
          accessibilityState={{ selected: isAccueilActive }}
          style={styles.row}
          onPress={goAccueil}
        >
          <Home color={isAccueilActive ? colors.secondary : colors.mutedText} size={18} />
          <Text style={isAccueilActive ? styles.rowTextActive : styles.rowText}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="drawer-link-search-requests"
          accessibilityState={{ selected: isSearchRequestsActive }}
          style={styles.row}
          onPress={goSearchRequests}
        >
          <ClipboardList color={isSearchRequestsActive ? colors.secondary : colors.mutedText} size={18} />
          <Text style={isSearchRequestsActive ? styles.rowTextActive : styles.rowText}>Demandes de recherche</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="drawer-link-terms"
          accessibilityState={{ selected: isLegalActive('terms') }}
          style={styles.row}
          onPress={() => goLegal('terms')}
        >
          <FileText color={isLegalActive('terms') ? colors.secondary : colors.mutedText} size={18} />
          <Text style={isLegalActive('terms') ? styles.rowTextActive : styles.rowText}>Conditions d&apos;utilisation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="drawer-link-privacy"
          accessibilityState={{ selected: isLegalActive('privacy') }}
          style={styles.row}
          onPress={() => goLegal('privacy')}
        >
          <Shield color={isLegalActive('privacy') ? colors.secondary : colors.mutedText} size={18} />
          <Text style={isLegalActive('privacy') ? styles.rowTextActive : styles.rowText}>Politique de confidentialité</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="drawer-link-data-deletion"
          accessibilityState={{ selected: isLegalActive('dataDeletion') }}
          style={styles.row}
          onPress={() => goLegal('dataDeletion')}
        >
          <Trash2 color={isLegalActive('dataDeletion') ? colors.secondary : colors.mutedText} size={18} />
          <Text style={isLegalActive('dataDeletion') ? styles.rowTextActive : styles.rowText}>Suppression des données</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontSize: 15, fontWeight: '700', color: colors.primary },
  nav: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  rowText: { fontSize: 14, fontWeight: '500', color: colors.mutedText },
  rowTextActive: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
