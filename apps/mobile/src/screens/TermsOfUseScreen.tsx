import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpRight, FileText, Mail, ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from '../navigation/types';

// Contenu copié mot pour mot de TermsOfUseClientPage.tsx (apps/location-maison) — seule source
// de vérité pour ce texte légal. Un écran natif remplace ici le WebView (décision explicite :
// affichage natif + accessible, pas de dépendance au chargement réseau d'une page web pour un
// texte qui ne change presque jamais). Si les CGU changent côté web, reporter le changement ici
// à la main — pas de mécanisme de sync automatique, comme convenu.
type Section = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'introduction',
    title: 'Objet',
    description:
      "Les présentes conditions encadrent l'accès et l'utilisation de la plateforme Trouve Ton Nkama. Toute utilisation implique leur acceptation.",
  },
  {
    id: 'eligibilite',
    title: 'Éligibilité du compte',
    description:
      "La création de compte est réservée aux utilisateurs fournissant des informations exactes et à jour.",
    bullets: [
      'Vous êtes responsable des données saisies lors de l’inscription.',
      'Vous devez protéger vos identifiants et votre mot de passe.',
      'Tout usage frauduleux peut entraîner suspension ou suppression du compte.',
    ],
  },
  {
    id: 'utilisation',
    title: 'Utilisation de la plateforme',
    description:
      "La plateforme permet la recherche, la publication et la gestion d'annonces immobilières dans un cadre conforme à la loi et aux bonnes pratiques.",
    bullets: [
      'Pas de contenu trompeur, illégal, diffamatoire ou discriminatoire.',
      "Pas d'usurpation d'identité ni de publication sans autorisation.",
      'Respect des autres utilisateurs et des règles de modération.',
    ],
  },
  {
    id: 'responsabilite',
    title: 'Responsabilités',
    description:
      'Chaque utilisateur est responsable de son contenu, de ses interactions et des engagements pris via la plateforme.',
    bullets: [
      'Les annonces doivent refléter fidèlement le bien proposé.',
      "L'utilisateur garantit la licéité des contenus publiés.",
      'Trouve Ton Nkama peut retirer un contenu non conforme sans préavis.',
    ],
  },
];

const MODIFICATIONS_SECTION: Section = {
  id: 'modifications',
  title: 'Modifications et version',
  description:
    'Ces conditions peuvent évoluer pour refléter les changements juridiques, techniques ou produit. La date de mise à jour fait foi.',
};

// Même valeur que NEXT_PUBLIC_EMAIL_SUPPORT (.env.local.dev et .env.local.prod côté web).
const CONTACT_EMAIL = 'glenneriss@gmail.com';
const ANNOUNCER_TERMS_URL = 'https://www.tonnkama.com/announcer-terms';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Legal'>;

export default function TermsOfUseScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="screen-legal-terms"
    >
      <View style={styles.badge}>
        <ShieldCheck size={16} color={colors.primary} />
        <Text style={styles.badgeText}>Cadre d&apos;utilisation</Text>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Conditions d&apos;utilisation
      </Text>
      <Text style={styles.subtitle}>
        Ces règles définissent vos droits et obligations lors de l&apos;utilisation de Trouve Ton
        Nkama.
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
          Données personnelles
        </Text>
        <Text style={styles.sectionText}>
          Les traitements de données sont détaillés dans la{' '}
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('Legal', { page: 'privacy' })}
            accessibilityRole="link"
            accessibilityLabel="Ouvrir la politique de confidentialité"
          >
            politique de confidentialité
          </Text>
          .
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {MODIFICATIONS_SECTION.title}
        </Text>
        <Text style={styles.sectionText}>{MODIFICATIONS_SECTION.description}</Text>
      </View>

      <View style={styles.relatedCard}>
        <Text style={styles.relatedTitle}>Documents liés</Text>
        <Text
          style={styles.relatedLink}
          onPress={() => navigation.navigate('Legal', { page: 'privacy' })}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir la politique de confidentialité (documents liés)"
        >
          Politique de confidentialité <ArrowUpRight size={13} color={colors.primary} />
        </Text>
        <Text
          style={styles.relatedLink}
          onPress={() => Linking.openURL(ANNOUNCER_TERMS_URL)}
          accessibilityRole="link"
          accessibilityLabel="Ouvrir les conditions annonceur (site web)"
        >
          Conditions annonceur <ArrowUpRight size={13} color={colors.primary} />
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
