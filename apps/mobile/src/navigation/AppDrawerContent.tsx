import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { X, ClipboardList, FileText, Shield, Trash2 } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Logo } from '../components/Logo';

// Reprend fidèlement MobileSidebar.tsx (web) — voir [[feedback-mobile-reuse-pwa-design]] :
// "Demandes de recherche" est en `font-semibold text-secondary` (juste une couleur de texte
// différente), PAS un fond plein en forme de pilule — un fond plein se lit comme un indicateur
// d'état "actif/sélectionné", ce que web ne fait JAMAIS ici (aucun highlight ne dépend de la
// route courante). Favoris n'existe pas dans SIDEBAR_LINKS côté web (accessible depuis la
// barre du bas une fois connecté à la place) — retiré, ne pas réinventer. Les items purement
// SEO/blog du web (Blog, Guide Immobilier, Maisons à louer/vendre, Publicité, Conditions
// annonceur) restent hors du scope V1 mobile. "Suppression des données" (conformité
// App Store/Play Store) n'a pas d'équivalent dans SIDEBAR_LINKS mais reste ici volontairement.
export function AppDrawerContent({ navigation }: DrawerContentComponentProps) {
  const close = () => navigation.closeDrawer();
  const goSearchRequests = () => {
    navigation.navigate('SearchRequests');
    close();
  };
  const goLegal = (page: 'terms' | 'privacy' | 'dataDeletion') => {
    navigation.navigate('Legal', { page });
    close();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <Logo size={30} />
          <Text style={styles.wordmark}>Trouve Ton Nkama</Text>
        </View>
        <TouchableOpacity onPress={close} accessibilityLabel="Fermer le menu">
          <X color={colors.foreground} size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.nav}>
        <TouchableOpacity style={styles.row} onPress={goSearchRequests}>
          <ClipboardList color={colors.secondary} size={18} />
          <Text style={styles.rowTextHighlight}>Demandes de recherche</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={() => goLegal('terms')}>
          <FileText color={colors.mutedText} size={18} />
          <Text style={styles.rowText}>Conditions d&apos;utilisation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => goLegal('privacy')}>
          <Shield color={colors.mutedText} size={18} />
          <Text style={styles.rowText}>Politique de confidentialité</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => goLegal('dataDeletion')}>
          <Trash2 color={colors.mutedText} size={18} />
          <Text style={styles.rowText}>Suppression des données</Text>
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
  rowTextHighlight: { fontSize: 14, fontWeight: '600', color: colors.secondary },
});
