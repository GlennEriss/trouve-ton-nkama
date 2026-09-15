import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth, createUserWithEmailAndPassword, signOut } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from '@react-native-firebase/firestore';
import { Building2, CircleUser, Phone } from 'lucide-react-native';
import {
  buildNewUserDocument,
  composeBirthDate,
  isValidBirthDate,
  isValidSignupPassword,
  type AccountType,
} from '../../lib/firestoreUser';
import { isValidGabonPhone, toGabonE164 } from '../../lib/phone';
import { apiFetch, API_BASE_URL } from '../../api/client';
import { GoogleLogo } from '../../components/GoogleLogo';
import { colors } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';

// Reproduit champ pour champ SignupMobileComponent.tsx (web, variante ≤768px — c'est la seule
// comparable à un écran mobile natif, la variante desktop SignupFormModern.tsx est un
// assistant en 4 étapes hors-sujet ici) + FormRegisterSchema (schema.ts) pour la validation +
// auth.service.ts pour la séquence d'appels (vérifs unicité -> Auth -> Firestore -> email de
// vérification, avec rollback si Firestore échoue) — voir [[feedback-mobile-reuse-pwa-design]].
// Écarts assumés (pas des oublis) : pas d'assistant multi-étapes (formulaire condensé comme
// déjà fait pour SignInScreen), jour/mois/année en 3 champs numériques au lieu de 3 <select>
// (aucun équivalent natif direct), liens Politique de confidentialité / Conditions
// (d'utilisation et annonceur) ouverts dans le navigateur système plutôt que dupliqués en
// écrans natifs à part les deux déjà existants.
export default function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SignUp'>>();

  const [accountType, setAccountType] = useState<AccountType>('User');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAnnouncerTerms, setAcceptAnnouncerTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const birthDate = composeBirthDate(birthDay, birthMonth, birthYear);

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    isValidSignupPassword(password) &&
    password === passwordConfirm &&
    isValidGabonPhone(phoneNumber) &&
    (!whatsappNumber.trim() || isValidGabonPhone(whatsappNumber)) &&
    isValidBirthDate(birthDate) &&
    acceptTerms &&
    (accountType !== 'Announcer' || acceptAnnouncerTerms);

  const handleSignUp = async () => {
    setError(null);

    if (!isValidBirthDate(birthDate)) {
      setError('Date de naissance invalide, ou vous avez moins de 18 ans.');
      return;
    }
    if (!isValidGabonPhone(phoneNumber)) {
      setError('Numéro de téléphone invalide.');
      return;
    }
    if (whatsappNumber.trim() && !isValidGabonPhone(whatsappNumber)) {
      setError('Numéro WhatsApp invalide.');
      return;
    }
    if (!isValidSignupPassword(password)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.");
      return;
    }
    if (accountType === 'Announcer' && !acceptAnnouncerTerms) {
      setError('Vous devez accepter les conditions annonceur pour créer un compte annonceur.');
      return;
    }

    const e164Phone = toGabonE164(phoneNumber.trim());
    const e164Whatsapp = whatsappNumber.trim() ? toGabonE164(whatsappNumber.trim()) : undefined;

    setIsLoading(true);
    let uid: string | undefined;
    try {
      const db = getFirestore();
      const usersRef = collection(db, 'users');

      const byPhone = await getDocs(query(usersRef, where('phoneNumbers', 'array-contains', e164Phone)));
      if (!byPhone.empty) {
        setError('Ce numéro de téléphone est déjà utilisé.');
        return;
      }
      const byEmail = await getDocs(query(usersRef, where('email', '==', email.trim())));
      if (!byEmail.empty) {
        setError('Cette adresse email est déjà utilisée.');
        return;
      }

      const credential = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
      uid = credential.user.uid;

      const newUser = buildNewUserDocument(uid, {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        pseudo: pseudo.trim() || undefined,
        birthDate,
        phoneNumber: e164Phone,
        whatsappNumber: e164Whatsapp,
        accountType,
      });

      try {
        await setDoc(doc(db, 'users', uid), newUser);
      } catch (firestoreErr) {
        // Rollback : comme auth.service.ts (web), on ne laisse pas un compte Auth orphelin
        // sans document Firestore — se déconnecter au minimum (la suppression complète du
        // compte Auth nécessiterait le SDK Admin, comme noté côté web).
        await signOut(getAuth()).catch(() => {});
        throw firestoreErr;
      }

      // Non-bloquant, comme sendVerificationEmail (web, auth.service.ts) : un échec ici ne doit
      // pas empêcher l'utilisateur de continuer, juste être silencieux.
      apiFetch('/api/auth/send-verification-email', { method: 'POST', body: { uid } }).catch(() => {});

      navigation.navigate('SignUpSuccess', { uid });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà utilisée.');
      } else if (code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible (8 caractères minimum, une majuscule, un chiffre).');
      } else if (code === 'auth/invalid-email') {
        setError("L'adresse email n'est pas valide.");
      } else {
        setError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openLegalLink = (path: string) => {
    Linking.openURL(`${API_BASE_URL}${path}`).catch(() => {
      Alert.alert('Impossible d’ouvrir le lien', 'Réessayez plus tard.');
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Explorons ensemble avec Trouve Ton Nkama !</Text>
        <Text style={styles.subtitle}>
          Créez votre compte Trouve Ton Nkama pour trouver votre logement de rêve partout au Gabon !
        </Text>

        <Text style={styles.label}>Type de compte</Text>
        <View style={styles.accountTypeRow}>
          <TouchableOpacity
            testID="signup-account-type-user"
            style={[styles.accountTypeCard, accountType === 'User' && styles.accountTypeCardActive]}
            onPress={() => setAccountType('User')}
          >
            <View style={styles.accountTypeHeader}>
              <CircleUser size={16} color={colors.foreground} />
              <Text style={styles.accountTypeTitle}>Utilisateur</Text>
            </View>
            <Text style={styles.accountTypeSubtitle}>Chercher un logement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="signup-account-type-announcer"
            style={[styles.accountTypeCard, accountType === 'Announcer' && styles.accountTypeCardActive]}
            onPress={() => setAccountType('Announcer')}
          >
            <View style={styles.accountTypeHeader}>
              <Building2 size={16} color={colors.foreground} />
              <Text style={styles.accountTypeTitle}>Annonceur</Text>
            </View>
            <Text style={styles.accountTypeSubtitle}>Publier des annonces</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TextInput
            testID="signup-firstname"
            style={[styles.input, styles.half]}
            placeholder="Saisissez votre prénom"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            testID="signup-lastname"
            style={[styles.input, styles.half]}
            placeholder="Saisissez votre nom"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
        <TextInput
          testID="signup-pseudo"
          style={styles.input}
          placeholder="Nom de l'entreprise (optionnel)"
          value={pseudo}
          onChangeText={setPseudo}
        />
        <TextInput
          testID="signup-email"
          style={styles.input}
          placeholder="Saisissez votre email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Date de naissance</Text>
        <View style={styles.row}>
          <TextInput
            testID="signup-birth-day"
            style={[styles.input, styles.third]}
            placeholder="Jour"
            keyboardType="number-pad"
            maxLength={2}
            value={birthDay}
            onChangeText={setBirthDay}
          />
          <TextInput
            testID="signup-birth-month"
            style={[styles.input, styles.third]}
            placeholder="Mois"
            keyboardType="number-pad"
            maxLength={2}
            value={birthMonth}
            onChangeText={setBirthMonth}
          />
          <TextInput
            testID="signup-birth-year"
            style={[styles.input, styles.third]}
            placeholder="Année"
            keyboardType="number-pad"
            maxLength={4}
            value={birthYear}
            onChangeText={setBirthYear}
          />
        </View>

        <Text style={styles.label}>Numéro d&apos;appel *</Text>
        <TextInput
          testID="signup-phone"
          style={styles.input}
          placeholder="Ex: 66 12 34 56 (sans 0)"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
        <Text style={styles.label}>Numéro WhatsApp</Text>
        <TextInput
          testID="signup-whatsapp"
          style={styles.input}
          placeholder="Laissez vide si c'est le même numéro"
          keyboardType="phone-pad"
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
        />

        <TextInput
          testID="signup-password"
          style={styles.input}
          placeholder="Saisissez votre mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          testID="signup-password-confirm"
          style={styles.input}
          placeholder="Confirmez votre mot de passe"
          secureTextEntry
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
        />

        <TouchableOpacity testID="signup-accept-terms" style={styles.checkboxRow} onPress={() => setAcceptTerms((v) => !v)}>
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>
            En cliquant sur s&apos;inscrire, vous êtes en accord avec notre{' '}
            <Text style={styles.link} onPress={() => openLegalLink('/privacy-policy')}>
              politique de confidentialité
            </Text>{' '}
            et nos{' '}
            <Text style={styles.link} onPress={() => openLegalLink('/terms-of-use')}>
              conditions d&apos;utilisation
            </Text>
            .
          </Text>
        </TouchableOpacity>

        {accountType === 'Announcer' && (
          <TouchableOpacity
            testID="signup-accept-announcer-terms"
            style={styles.checkboxRow}
            onPress={() => setAcceptAnnouncerTerms((v) => !v)}
          >
            <View style={[styles.checkbox, acceptAnnouncerTerms && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>
              J&apos;accepte les{' '}
              <Text style={styles.link} onPress={() => openLegalLink('/announcer-terms')}>
                conditions annonceur
              </Text>
              .
            </Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          testID="signup-submit"
          style={[styles.button, (!canSubmit || isLoading) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Créer un compte</Text>}
        </TouchableOpacity>

        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>OU</Text>
          <View style={styles.separatorLine} />
        </View>

        <TouchableOpacity
          style={styles.outlineButton}
          disabled={isLoading}
          onPress={() => Alert.alert('Bientôt disponible', 'La connexion avec Google arrive prochainement.')}
        >
          <GoogleLogo />
          <Text style={styles.outlineButtonText}>Continuer avec Google</Text>
        </TouchableOpacity>

        {/* Inscription par numéro de téléphone : contrairement au web (PhoneAuthModal, qui crée
            un compte à la volée pour un numéro inconnu), PhoneSignInScreen côté mobile ne fait
            que CONNECTER un compte déjà existant (voir son commentaire) — la création de compte
            par OTP seul n'est pas encore portée sur mobile. On réutilise quand même le même
            écran ici : un numéro déjà inscrit (web ou mobile) s'y connecte normalement. */}
        <TouchableOpacity
          style={styles.outlineButton}
          disabled={isLoading}
          onPress={() => navigation.navigate('PhoneSignIn')}
        >
          <Phone size={18} color={colors.secondary} />
          <Text style={styles.outlineButtonText}>Continuer avec Numéro de téléphone</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 14, color: colors.mutedText, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  third: { flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16 },
  accountTypeRow: { flexDirection: 'row', gap: 10 },
  accountTypeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 74,
  },
  accountTypeCardActive: { borderColor: colors.secondary, backgroundColor: '#E6F5F3' },
  accountTypeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountTypeTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  accountTypeSubtitle: { fontSize: 12, color: colors.mutedText, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#999', marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 19 },
  link: { color: '#1D4ED8', textDecorationLine: 'underline' },
  button: { backgroundColor: colors.primary, borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: colors.destructive, fontSize: 13, textAlign: 'center' },
  separatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { marginHorizontal: 12, color: colors.primary, fontWeight: '600', fontSize: 12 },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 14,
  },
  outlineButtonText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
});
