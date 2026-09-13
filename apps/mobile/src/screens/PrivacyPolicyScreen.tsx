import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpRight, FileText, Mail, ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from '../navigation/types';

// Contenu copié mot pour mot de PrivacyPolicyClientPage.tsx (apps/location-maison) — seule
// source de vérité pour ce texte légal. Même décision que TermsOfUseScreen : écran natif
// accessible plutôt qu'un WebView dépendant du réseau, pour un texte qui ne change presque
// jamais. Si la politique change côté web, reporter le changement ici à la main.
type Section = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'collecte',
    title: 'Données collectées',
    description:
      'Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme et à la qualité de service.',
    bullets: [
      "Informations d'identité : nom, prénom et date de naissance.",
      'Coordonnées : email et numéro de téléphone.',
      "Données d'usage : logs techniques, navigateur, appareil et adresse IP.",
      'Contenus publiés : annonces, photos, descriptions et interactions.',
    ],
  },
  {
    id: 'utilisation',
    title: 'Utilisation de vos données',
    description: 'Les données collectées sont utilisées pour exploiter le service de manière fiable et sécurisée.',
    bullets: [
      'Création et gestion de compte.',
      'Publication et modération des annonces.',
      'Communication liée au service (notifications, sécurité, support).',
      "Amélioration continue de l'expérience utilisateur.",
    ],
  },
  {
    id: 'partage',
    title: 'Partage et transfert',
    description:
      'Nous ne revendons pas vos données. Les partages sont limités à des besoins techniques, légaux ou de sécurité.',
    bullets: [
      "Prestataires techniques strictement nécessaires à l'exploitation.",
      'Réquisitions légales des autorités compétentes.',
      'Protection des droits de la plateforme, des utilisateurs et des tiers.',
    ],
  },
  {
    id: 'conservation',
    title: 'Durée de conservation',
    description:
      'Nous conservons les données pendant une durée proportionnée à la finalité, puis elles sont supprimées ou anonymisées.',
    bullets: [
      'Données de compte : conservées tant que le compte est actif.',
      'Données réglementaires : conservées selon les obligations légales applicables.',
      'Logs techniques : conservés pour diagnostic, sécurité et prévention de fraude.',
    ],
  },
];

const DROITS_BULLETS = [
  "Droit d'accès et de rectification.",
  "Droit d'opposition et de limitation selon les cas.",
  'Droit à la suppression dans les limites légales.',
];

// Même valeur que NEXT_PUBLIC_EMAIL_SUPPORT (.env.local.dev et .env.local.prod côté web).
const CONTACT_EMAIL = 'glenneriss@gmail.com';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Legal'>;

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="screen-legal-privacy"
    >
      <View style={styles.badge}>
        <ShieldCheck size={16} color={colors.primary} />
        <Text style={styles.badgeText}>Protection des données</Text>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Politique de confidentialité
      </Text>
      <Text style={styles.subtitle}>
        Cette page explique quelles données sont collectées, pourquoi elles le sont, et comment
        elles sont protégées sur Trouve Ton Nkama.
      </Text>
      <Text style={styles.updatedAt}>Dernière mise à jour : 5 mars 2026</Text>

      {SECTIONS.map((section) => (
        <View key={section.id} style={styles.card}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {section.title}
          </Text>
          <Text style={styles.sectionText}>{section.description}</Text>
          {section.bullets?.map((bullet, index) => (
            <View key={`${section.id}-${index}`} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Vos droits
        </Text>
        <Text style={styles.sectionText}>
          Vous pouvez demander l&apos;accès, la correction ou la suppression de vos données. Pour
          une demande de suppression complète, consultez la page{' '}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('Legal', { page: 'dataDeletion' })}
            accessibilityRole="link"
            accessibilityLabel="Ouvrir la page suppression des données"
          >
            suppression des données
          </Text>
          .
        </Text>
        {DROITS_BULLETS.map((bullet, index) => (
          <View key={`droits-${index}`} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <Text style={styles.bulletText}>{bullet}</Text>
          </View>
        ))}
      </View>

      <View style={styles.relatedCard}>
        <Text style={styles.relatedTitle}>Documents liés</Text>
        <Text
          style={styles.relatedLink}
          onPress={() => navigation.navigate('Legal', { page: 'terms' })}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir les conditions d'utilisation"
        >
          Conditions d&apos;utilisation <ArrowUpRight size={13} color={colors.primary} />
        </Text>
      </View>

      <View style={styles.contactCard}>
        <Mail size={18} color={colors.primary} />
        <Text style={styles.contactLabel}>Contact légal :</Text>
        <Text
          style={styles.contactEmail}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          accessibilityRole="link"
          accessibilityLabel={`Envoyer un e-mail à ${CONTACT_EMAIL}`}
        >
          {CONTACT_EMAIL}
        </Text>
      </View>

      <View style={styles.footer}>
        <FileText size={14} color={colors.mutedText} />
        <Text style={styles.footerText}>Ces informations sont publiées par Trouve Ton Nkama.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: `${colors.primary}1A`,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 26, fontWeight: '800', color: colors.foreground, lineHeight: 32 },
  subtitle: { fontSize: 15, color: colors.mutedText, lineHeight: 22 },
  updatedAt: { fontSize: 13, fontWeight: '600', color: colors.mutedText },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  sectionText: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
  link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 15, color: colors.foreground, lineHeight: 21 },
  relatedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  relatedTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  relatedLink: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  contactCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}14`,
    borderRadius: 16,
    padding: 18,
  },
  contactLabel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  contactEmail: { fontSize: 15, color: colors.primary, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 8 },
  footerText: { fontSize: 13, color: colors.mutedText },
});
