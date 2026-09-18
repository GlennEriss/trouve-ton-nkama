import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { AlertTriangle, AtSign, CalendarDays, ChevronDown, CircleUser, Link2, Mail } from 'lucide-react-native';
import { useUserDoc } from '../hooks/useUserDoc';
import {
  getPhoneChangeLockInfo,
  isValidSignupEmail,
  isValidSocialHandle,
  normalizeSocialHandle,
} from '../lib/firestoreUser';
import { isValidGabonPhone, toGabonE164 } from '../lib/phone';
import { generateColorFromName, getUserDisplayInitial, getUserDisplayName } from '../lib/userDisplay';
import { GradientButton } from '../components/GradientButton';
import { colors } from '../theme/colors';

type SocialKey = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'x';
const SOCIAL_NETWORKS: { key: SocialKey; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
];

// Reproduit /profil/informations (ProfileInformationFormModern.tsx, web) — voir
// [[feedback-mobile-reuse-pwa-design]]. Prénom/Nom/Date de naissance sont en lecture seule côté
// web ("Les autres informations sont en lecture seule") ; seuls Nom de l'entreprise, Email (pour
// un compte inscrit par téléphone qui n'en a pas encore — voir hasEmail plus bas), Numéro de
// téléphone (avec verrou 30 jours post-vérification) et, pour les comptes Annonceur, les réseaux
// sociaux, sont réellement modifiables. Écarts assumés : pas de sélecteur Pays complet
// (~190 pays) — l'app mobile ne valide que des numéros gabonais (voir phone.ts), donc "Pays" est
// affiché en badge statique plutôt qu'un select avec une seule option utilisable ; pas de
// dispatch d'événements d'activité de compte (fonctionnalité d'audit web, hors scope).
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { userDoc, isLoading } = useUserDoc();

  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [socialHandles, setSocialHandles] = useState<Record<SocialKey, string>>({
    facebook: '',
    instagram: '',
    tiktok: '',
    linkedin: '',
    x: '',
  });
  const [socialOpen, setSocialOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPhone = userDoc?.callNumber ?? userDoc?.phoneNumbers?.[0] ?? '';

  useEffect(() => {
    if (!userDoc) return;
    setPseudo(userDoc.pseudo ?? '');
    setEmail(userDoc.email ?? '');
    // Comme signup-phone (SignUpScreen.tsx) : le champ n'affiche que la partie locale, le
    // préfixe +241 est déjà rendu à part — sinon "+241" apparaît deux fois à l'écran.
    setPhoneLocal(currentPhone.replace(/^\+241/, ''));
    setSocialHandles({
      facebook: userDoc.socialProfiles?.facebook?.handle ?? '',
      instagram: userDoc.socialProfiles?.instagram?.handle ?? '',
      tiktok: userDoc.socialProfiles?.tiktok?.handle ?? '',
      linkedin: userDoc.socialProfiles?.linkedin?.handle ?? '',
      x: userDoc.socialProfiles?.x?.handle ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc]);

  const isAnnouncer = Array.isArray(userDoc?.roles) && userDoc.roles.includes('Announcer');
  // Miroir de hasEmail (web, ProfileInformationFormModern.tsx) : un compte inscrit par téléphone
  // (OTP) n'a pas d'email tant qu'il n'en ajoute pas un — le champ ne doit être verrouillé QUE
  // pour un compte qui en a déjà un (Google/Facebook/Credentials), pas pour tout le monde.
  const hasEmail = Boolean(userDoc?.email?.trim());
  const displayName = getUserDisplayName(userDoc);
  const lockInfo = useMemo(() => getPhoneChangeLockInfo(userDoc), [userDoc]);
  const normalizedPhone = toGabonE164(phoneLocal.trim());
  const phoneChangedFromCurrent = normalizedPhone !== currentPhone && phoneLocal.trim() !== '';
  const willLoseVerifiedStatus = userDoc?.phoneNumberVerified && phoneChangedFromCurrent;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleSave = async () => {
    const uid = getAuth().currentUser?.uid;
    if (!uid || !userDoc) return;
    setError(null);

    if (lockInfo.isLocked && phoneChangedFromCurrent) {
      Alert.alert(
        'Changement de numéro verrouillé',
        `Numéro vérifié verrouillé jusqu'au ${lockInfo.lockUntilDate?.toLocaleDateString('fr-FR')}.`,
      );
      return;
    }
    if (!isValidGabonPhone(phoneLocal)) {
      setError('Numéro de téléphone invalide.');
      return;
    }
    if (pseudo.length > 50) {
      setError('Le pseudo ne doit pas dépasser 50 caractères.');
      return;
    }
    // Un compte qui a déjà un email (Google/Facebook/Credentials) le garde géré par sa méthode
    // de connexion — ce chemin ne fait QUE combler un email absent (compte inscrit par
    // téléphone), jamais remplacer un email existant (même règle que web, voir hasEmail et
    // profile-information.service.ts).
    const trimmedEmail = email.trim();
    const emailToSet = !hasEmail && trimmedEmail ? trimmedEmail : null;
    if (emailToSet && !isValidSignupEmail(emailToSet)) {
      setError("L'adresse email n'est pas valide.");
      return;
    }
    const normalizedSocials = Object.fromEntries(
      SOCIAL_NETWORKS.map(({ key }) => [key, normalizeSocialHandle(socialHandles[key])]),
    ) as Record<SocialKey, string>;
    for (const { key, label } of SOCIAL_NETWORKS) {
      const handle = normalizedSocials[key];
      if (handle && !isValidSocialHandle(handle)) {
        setError(`Identifiant ${label} invalide.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (emailToSet) {
        // Même vérification d'unicité que SignUpScreen.tsx (byEmail) et findByEmail (web,
        // user.repository.ts) : un email ne peut être rattaché qu'à un seul compte.
        const usersRef = collection(getFirestore(), 'users');
        const byEmail = await getDocs(query(usersRef, where('email', '==', emailToSet)));
        const usedByAnotherAccount = byEmail.docs.some((d) => d.id !== uid);
        if (usedByAnotherAccount) {
          setError('Cette adresse email est déjà utilisée par un autre compte.');
          setIsSaving(false);
          return;
        }
      }

      const phoneNumberVerified = willLoseVerifiedStatus ? false : (userDoc.phoneNumberVerified ?? false);
      await updateDoc(doc(getFirestore(), 'users', uid), {
        pseudo: pseudo.trim(),
        ...(emailToSet ? { email: emailToSet } : {}),
        phoneNumbers: [normalizedPhone],
        callNumber: normalizedPhone,
        phoneNumberVerified,
        metadata: {
          ...(userDoc.metadata ?? {}),
          phoneVerification: willLoseVerifiedStatus ? { lockUntil: null } : userDoc.metadata?.phoneVerification ?? {},
        },
        ...(isAnnouncer
          ? {
              socialProfiles: Object.fromEntries(
                SOCIAL_NETWORKS.map(({ key }) => [key, { handle: normalizedSocials[key] }]),
              ),
            }
          : {}),
      });

      if (willLoseVerifiedStatus) {
        Alert.alert(
          'Informations mises à jour',
          'Numéro modifié : le statut "numéro vérifié" a été retiré. Vérifiez à nouveau votre numéro.',
        );
      } else {
        Alert.alert('Informations mises à jour', 'Votre profil a été mis à jour avec succès.');
      }
      // Contrairement à l'ancienne version de cet écran, on reste sur la page après
      // enregistrement — comme le web (pas de redirection après un submit réussi).
    } catch {
      setError('Impossible d’enregistrer. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.identityCard}>
          <View style={[styles.avatar, { backgroundColor: generateColorFromName(displayName) }]}>
            <Text style={styles.avatarInitial}>{getUserDisplayInitial(userDoc)}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.displayName}>{displayName ?? 'Compte'}</Text>
            <View style={[styles.badge, userDoc?.phoneNumberVerified ? styles.badgeVerified : styles.badgeUnverified]}>
              <Text style={styles.badgeText}>{userDoc?.phoneNumberVerified ? 'Vérifié' : 'Non vérifié'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {hasEmail
            ? 'Modifiez votre numéro de téléphone et votre pays. Les autres informations sont en lecture seule.'
            : 'Modifiez votre numéro de téléphone, votre pays et ajoutez une adresse email. Les autres informations sont en lecture seule.'}
        </Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Prénom</Text>
            <View style={styles.inputRow}>
              <CircleUser size={20} color={colors.secondary} />
              <TextInput style={styles.inputDisabled} value={userDoc?.firstname ?? ''} editable={false} />
            </View>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Nom</Text>
            <View style={styles.inputRow}>
              <CircleUser size={20} color={colors.secondary} />
              <TextInput style={styles.inputDisabled} value={userDoc?.lastname ?? ''} editable={false} />
            </View>
          </View>
        </View>

        <Text style={styles.label}>Nom de l&apos;entreprise (optionnel)</Text>
        <View style={styles.inputRow}>
          <AtSign size={20} color={colors.secondary} />
          <TextInput
            testID="edit-profile-pseudo"
            style={styles.input}
            placeholder="Laissez vide pour afficher votre prénom et nom"
            value={pseudo}
            onChangeText={setPseudo}
          />
        </View>

        <Text style={styles.label}>Adresse email</Text>
        <View style={styles.inputRow}>
          <Mail size={20} color={colors.secondary} />
          <TextInput
            testID="edit-profile-email"
            style={hasEmail ? styles.inputDisabled : styles.input}
            value={hasEmail ? (userDoc?.email ?? '') : email}
            editable={!hasEmail}
            onChangeText={setEmail}
            placeholder="email@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <Text style={styles.emailHelper}>
          {hasEmail
            ? "L'email est géré par votre méthode de connexion et ne se modifie pas ici."
            : 'Vous vous êtes inscrit par téléphone : ajoutez une adresse email pour sécuriser votre compte et recevoir vos notifications importantes.'}
        </Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Date de naissance</Text>
            <View style={styles.inputRow}>
              <CalendarDays size={20} color={colors.secondary} />
              <TextInput style={styles.inputDisabled} value={userDoc?.birthDate ?? ''} editable={false} />
            </View>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Pays</Text>
            <View style={[styles.inputRow, styles.countryPill]}>
              <Text style={styles.countryText}>🇬🇦 Gabon</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Numéro de téléphone</Text>
        <View style={styles.phoneRow}>
          <View style={styles.phonePrefix}>
            <Text style={styles.phonePrefixText}>+241</Text>
          </View>
          <TextInput
            testID="edit-profile-phone"
            style={[styles.input, styles.phoneInput, lockInfo.isLocked && styles.inputDisabled]}
            keyboardType="phone-pad"
            value={phoneLocal}
            onChangeText={setPhoneLocal}
            editable={!lockInfo.isLocked}
          />
        </View>

        {lockInfo.isLocked && (
          <View style={styles.warningBox}>
            <AlertTriangle size={18} color="#92400E" />
            <Text style={styles.warningText}>
              Numéro verrouillé temporairement. Ce numéro est vérifié, il pourra être modifié dans {lockInfo.daysRemaining} jour
              {lockInfo.daysRemaining > 1 ? 's' : ''}.
            </Text>
          </View>
        )}
        {!lockInfo.isLocked && willLoseVerifiedStatus && (
          <View style={styles.warningBox}>
            <AlertTriangle size={18} color="#92400E" />
            <Text style={styles.warningText}>
              Attention : en changeant votre numéro, vous perdrez le statut &quot;numéro vérifié&quot; et devrez refaire la
              vérification OTP.
            </Text>
          </View>
        )}

        {isAnnouncer && (
          <View style={styles.socialSection}>
            <TouchableOpacity testID="edit-profile-social-toggle" style={styles.socialToggle} onPress={() => setSocialOpen((v) => !v)}>
              <Link2 size={18} color={colors.foreground} />
              <Text style={styles.socialToggleText}>Réseaux sociaux (facultatif)</Text>
              <ChevronDown size={18} color={colors.mutedText} style={socialOpen ? styles.chevronOpen : undefined} />
            </TouchableOpacity>
            {socialOpen && (
              <View style={styles.socialBody}>
                <Text style={styles.socialHint}>Indiquez juste votre @ : le lien est généré automatiquement.</Text>
                {SOCIAL_NETWORKS.map(({ key, label }) => (
                  <View key={key}>
                    <Text style={styles.label}>{label}</Text>
                    <View style={styles.inputRow}>
                      <AtSign size={20} color={colors.secondary} />
                      <TextInput
                        testID={`edit-profile-social-${key}`}
                        style={styles.input}
                        placeholder="@username"
                        autoCapitalize="none"
                        value={socialHandles[key]}
                        onChangeText={(v) => setSocialHandles((prev) => ({ ...prev, [key]: v }))}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <GradientButton
          title={isSaving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
          onPress={handleSave}
          isLoading={isSaving}
          disabled={!phoneLocal.trim()}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '700', color: '#fff' },
  identityText: { gap: 6 },
  displayName: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeVerified: { backgroundColor: colors.primary },
  badgeUnverified: { backgroundColor: colors.secondary },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  subtitle: { fontSize: 13, color: colors.mutedText, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 10, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.foreground },
  inputDisabled: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.mutedText },
  emailHelper: { fontSize: 12, color: colors.primary, marginTop: 4 },
  countryPill: { paddingVertical: 12 },
  countryText: { fontSize: 15, color: colors.foreground },
  phoneRow: { flexDirection: 'row', gap: 10 },
  phonePrefix: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  phonePrefixText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  phoneInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, backgroundColor: '#F9FAFB' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400E' },
  socialSection: { marginTop: 12 },
  socialToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  socialToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  socialBody: { gap: 4 },
  socialHint: { fontSize: 12, color: colors.mutedText, marginBottom: 4 },
  error: { color: colors.destructive, fontSize: 13, textAlign: 'center', marginTop: 8 },
  submitButton: { marginTop: 20 },
});
