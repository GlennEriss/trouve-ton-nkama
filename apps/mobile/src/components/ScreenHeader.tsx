import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { useAppHeaderConsumedTopInset } from '../navigation/AppHeaderInsetContext';

// En-tête partagé — même disposition (flèche de retour + titre alignés horizontalement et
// centrés verticalement, fond blanc, séparateur fin en bas, hauteur compacte) que l'en-tête de
// référence "Mes annonces" (MyListingsScreen), repris ici une seule fois pour que les écrans
// Politique de confidentialité / Conditions d'utilisation / Favoris / Paramètres / Connexion et
// sécurité (et Suppression des données, même routeur "Legal") rendent tous un en-tête identique
// sur Android et iOS, au lieu de dépendre chacun du rendu natif ou d'une mise en page différente.
export function ScreenHeader({
  title,
  onBack,
  rightAction,
  testID,
}: {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
  testID?: string;
}) {
  const { palette } = useAppTheme();
  const topInsetAlreadyConsumed = useAppHeaderConsumedTopInset();
  // AppHeader (voir AppDrawer.tsx) consomme déjà l'inset du haut d'écran sur les écrans montés
  // sous ProfileStack (Mes annonces, Paramètres, Connexion et sécurité, pages légales ouvertes
  // depuis le menu Profil) — y appliquer un deuxième SafeAreaView top ajoutait un bandeau vide
  // supplémentaire entre AppHeader et ce titre. Favoris et les pages légales ouvertes depuis le
  // menu hamburger n'ont pas cet en-tête ambiant et gardent donc le vrai inset.
  const Container = topInsetAlreadyConsumed ? View : SafeAreaView;
  const containerProps = topInsetAlreadyConsumed ? {} : { edges: ['top'] as const };

  return (
    <Container
      {...containerProps}
      style={[styles.safeArea, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}
    >
      <View style={styles.row} testID={testID}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={24} color={palette.foreground} />
        </TouchableOpacity>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: palette.foreground }]}>
          {title}
        </Text>
        <View style={styles.rightSlot}>{rightAction}</View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#fff', borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16, gap: 12 },
  back: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '700' },
  rightSlot: { minWidth: 24, alignItems: 'flex-end' },
});
