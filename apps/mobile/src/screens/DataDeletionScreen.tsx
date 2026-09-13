import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, Mail } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from '../navigation/types';

// Contenu copié mot pour mot de DataDeletionClientPage.tsx / DataDeletionMobilePage.tsx
// (apps/location-maison) — même décision que TermsOfUseScreen/PrivacyPolicyScreen : écran natif
// accessible plutôt qu'un WebView dépendant du réseau. Cette page n'utilise PAS
// LegalDocumentTemplate côté web (pas de badge, pas de sections à puces) — structure différente
// délibérément conservée ici : avertissement d'irréversibilité + carte de contact + paragraphes.
// La date "28 avril 2025" vient de DataDeletionMobilePage.tsx (seule variante qui en affiche
// une ; la variante desktop n'en affiche aucune).
const CONTACT_EMAIL = 'glenneriss@gmail.com';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Legal'>;

export default function DataDeletionScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="screen-legal-dataDeletion"
    >
      <Text style={styles.title} accessibilityRole="header">
        Suppression des Données
      </Text>
      <Text style={styles.subtitle}>
        Nous respectons votre droit à la confidentialité et à la suppression de vos données
      </Text>
      <Text style={styles.updatedAt}>Dernière mise à jour : 28 avril 2025</Text>

      <View style={styles.warningCard}>
        <AlertTriangle size={20} color={colors.warning} />
        <View style={styles.warningTextGroup}>
          <Text style={styles.warningTitle} accessibilityRole="header">
            Important à savoir
          </Text>
          <Text style={styles.warningText}>
            La suppression de vos données est irréversible. Une fois supprimées, nous ne pourrons
            pas restaurer vos informations.
          </Text>
        </View>
      </View>

      <Text style={styles.paragraph}>
        Conformément à la politique de protection des données, vous avez le droit de demander la
        suppression de vos données personnelles associées à votre compte.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Comment demander la suppression ?
        </Text>
        <View style={styles.contactRow}>
          <View style={styles.mailIconCircle}>
            <Mail size={18} color="#fff" />
          </View>
          <View style={styles.contactTextGroup}>
            <Text style={styles.sectionText}>Envoyez votre demande par email à :</Text>
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
              accessibilityRole="link"
              accessibilityLabel={`Envoyer un e-mail à ${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </Text>
            <Text style={styles.contactHint}>Objet : « Suppression de compte »</Text>
          </View>
        </View>
      </View>

      <Text style={styles.paragraph}>
        Une fois votre demande reçue, nous traiterons la suppression de vos données dans un délai
        de 30 jours, conformément à nos conditions d&apos;utilisation et notre politique de
        confidentialité.
      </Text>

      <Text style={styles.paragraph}>
        Pour plus d&apos;informations, consultez notre{' '}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('Legal', { page: 'privacy' })}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir la politique de confidentialité"
        >
          Politique de Confidentialité
        </Text>
        .
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.foreground, lineHeight: 32 },
  subtitle: { fontSize: 15, color: colors.mutedText, lineHeight: 22 },
  updatedAt: { fontSize: 13, fontWeight: '600', color: colors.mutedText },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 16,
  },
  warningTextGroup: { flex: 1, gap: 4 },
  warningTitle: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  warningText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  paragraph: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  contactRow: { flexDirection: 'row', gap: 14 },
  mailIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextGroup: { flex: 1, gap: 4 },
  sectionText: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
  link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  contactHint: { fontSize: 13, color: colors.mutedText },
});
