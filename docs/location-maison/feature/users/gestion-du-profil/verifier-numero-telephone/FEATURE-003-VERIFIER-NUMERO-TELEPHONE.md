# FEATURE-003 - Verifier Numero De Telephone

## 1. Contexte

La verification telephone est retiree du flux signup/signin pour reduire la friction.
Elle devient une sous-feature dediee du domaine `users` et s'execute depuis l'espace profil.

References:

- `documentation/feature/users/gestion-du-profil/FEATURE-001-GESTION-PROFIL.md`
- `documentation/feature/auth/FEATURE-005-PHONE-NUMBER-POLICY.md`
- `documentation/setup/FIREBASE_PHONE_AUTH_SETUP.md`

## 2. Objectif fonctionnel

1. Permettre a un utilisateur connecte (`User` ou `Announcer`) de:
- demander un code OTP SMS Firebase
- saisir et confirmer le code OTP
- obtenir le statut `phoneNumberVerified = true`

2. Permettre aussi la verification lors d'un changement de numero:
- si le numero est modifie apres verification, il perd le statut verifie (`phoneNumberVerified = false`)
- l'utilisateur est averti explicitement dans l'ecran profil informations

## 3. RBAC et acces

- `User`: acces autorise
- `Announcer`: acces autorise (heritage des droits `User`)
- non connecte: acces interdit (middleware -> redirection signin)
- `Admin`: hors scope

Routes:

- entree: `/profil` (bouton "Verifier mon numero de telephone")
- ecran OTP: `/verify-phone`

## 4. Parcours utilisateur cible

1. Depuis `/profil`, l'utilisateur ouvre `/verify-phone`.
2. Il saisit son numero (pays + numero local) ou garde le numero actuel.
3. L'app initialise reCAPTCHA Firebase puis envoie OTP SMS.
4. L'utilisateur saisit le code OTP.
5. En succes:
- numero (eventuellement modifie) persiste en base
- `phoneNumberVerified` passe a `true`
- session utilisateur synchronisee
- toast succes + retour profil

## 5. Architecture cible (feature-based)

Code:

- `src/features/users/phone-verification/services/`
- `src/features/users/phone-verification/hooks/`
- `src/features/users/phone-verification/ui/v1/`
- `src/features/users/phone-verification/__tests__/`

Regles:

- page `src/app/(protected)/verify-phone/page.tsx` = entrypoint uniquement
- pas de logique metier OTP/Firestore dans la page
- logs structures obligatoires (`createLogger`)

## 6. Contrats metier

### 6.1 Validation numero

- utiliser la policy existante (`validatePhoneNumberForSupportedCountries`)
- respecter pays actives (`getEnabledCountries` + `SUPPORTED_COUNTRIES`)

### 6.2 Etats de verification

- `phone`: saisie numero + envoi OTP
- `otp`: saisie code + timer expiration
- `success`: verification terminee
- `already-verified`: numero deja verifie

### 6.3 Regle de coherence profil

- Modification du numero dans `/profil/informations`:
  - conservee autorisee
  - invalide le statut (`phoneNumberVerified = false`)
  - message d'avertissement affiché avant sauvegarde

## 7. Gestion erreurs et logs

Erreurs attendues:

- `auth/invalid-phone-number`
- `auth/too-many-requests`
- `auth/quota-exceeded`
- `auth/invalid-verification-code`
- `auth/code-expired`
- erreurs reCAPTCHA
- erreurs persistance Firestore/session

Observabilite:

- `scope`: `users.phone-verification.*`
- logs `info` sur succes OTP et persistance
- logs `warn/error` sur rejet OTP, timeout, persistance

## 8. Criteres d'acceptation

1. Fonctionnel
- bouton visible dans `/profil`
- OTP fonctionnel sur `/verify-phone`
- `phoneNumberVerified` mis a jour correctement
- session rafraichie apres succes

2. Metier
- si numero change, ancien statut verifie est perdu
- message d'avertissement visible dans `/profil/informations`

3. Architecture
- route `/verify-phone` branchee sur module `src/features/users/phone-verification`
- logique metier extraite page -> service/hook

4. Qualite
- tests unitaires service (minimum)
- tests integration OTP a ajouter ensuite

## 9. Hors scope

- OTP pendant signup/signin
- verification WhatsApp/voix
- anti-fraude avancee (scoring, device fingerprint)
