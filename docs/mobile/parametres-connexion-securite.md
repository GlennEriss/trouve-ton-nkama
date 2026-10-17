# Paramètres et connexion/sécurité — mobile

## Référence et périmètre

La PWA reste la référence : pages `settings` et `login-and-security`, composants
`ParameterSystem`, `ParameterNotifications`, `LoginAndSecurity`, `PasswordModal`,
et catalogue `connections-methods.tsx`. Ce dernier expose Google ; Facebook y est
actuellement commenté. Le mobile n'active donc pas Facebook par défaut.

Parcours natifs : Profil → Paramètres → Connexion et sécurité ; accès direct depuis
Profil également. Retour natif conservé, garde d'authentification existante réutilisée.
Les pages défilent, avec 24 px de padding sous la navbar, sans deuxième inset supérieur.

## Implémentation

| Fichiers mobile | Rôle |
| --- | --- |
| `screens/SettingsScreen.tsx`, `api/settings.ts` | Apparence et six préférences PWA, sauvegarde d'un seul champ Firestore par opération |
| `screens/SecurityScreen.tsx`, `lib/accountSecurity.ts` | Méthodes de connexion, confirmation du mot de passe, association et messages d'état |
| `lib/googleAuth.ts` | Acquisition Google existante réutilisée, distincte de la connexion Firebase |
| `lib/facebookAuth.ts` | Acquisition native Facebook conditionnelle, nonce iOS, aucun faux jeton |
| `theme/ThemeProvider.tsx` | Palette claire/sombre, persistance AsyncStorage, apparence système |
| `components/AccountPage.tsx` | Structure commune exclusivement aux deux nouvelles pages |
| `navigation/{ProfileStack,RootNavigator,MainTabs,AppHeader,types}.tsx` (types : `.ts`) | Routes natives et couleurs de navigation |
| `screens/ProfileScreen.tsx` | Remplacement des entrées temporaires par les routes natives |
| `screens/auth/ForgotPasswordScreen.tsx` | Flux Firebase existant ; les erreurs réseau ne sont plus présentées comme un succès |
| `App.tsx`, `app.json`, `app.config.js`, `react-native.config.js` | Provider thème, apparence automatique et SDK Facebook conditionnel |
| `.env.example`, `package.json`, lockfile racine | Configuration publique et dépendances natives |

Les six clés et libellés exacts sont centralisés dans `api/settings.ts` et utilisent
`users.notificationParameter`. `useUserDoc` fournit leur synchronisation temps réel.
Aucune règle métier de notifications critiques n'est modifiée.

Le thème est mémorisé sur l'appareil et couvre les deux nouvelles pages et la
navigation. Les anciens écrans ayant des couleurs codées en dur ne sont pas convertis
dans ce lot : le thème sombre de toute l'application n'est pas encore homogène.

## Authentification et sécurité

`linkAccountProvider` capture l'utilisateur Firebase courant, recharge ses fournisseurs,
réauthentifie avec le mot de passe si nécessaire, acquiert l'identité OAuth puis appelle
**linkWithCredential**, jamais `signInWithCredential`. L'UID est revérifié entre les
opérations asynchrones. Aucun nouveau compte ni remplacement de session n'est demandé.

La synchronisation `users.providers` utilise `arrayUnion` et peut être retentée après
un échec partiel. Une erreur de notification n'annule pas une association réussie.
Les collisions de comptes et les fournisseurs déjà associés ont des messages explicites.
Le mot de passe reste seulement dans l'état éphémère du formulaire.

Côté Web, `api/users/account-activity/notify/route.ts` réutilise
`resolveAuthenticatedUid` : session NextAuth existante ou jeton Bearer Firebase vérifié
par Admin Auth. L'UID du corps client ne sert jamais à identifier le destinataire.
Les validations d'événement et le service de notification existants sont conservés.
Les jetons invalides ne donnent aucun accès.

Le serveur API et l'application doivent cibler **le même projet Firebase**. Le fichier
Google Android inspecté cible `location-maison-dev` : ne pas tester ses jetons contre
une API configurée pour le projet de production. La modification serveur n'est pas déployée
automatiquement par cette mission.

## Facebook : configuration restante

Valeurs publiques identifiées (aucun App Secret consultable dans ce document) :

- Meta App ID existant : `1302423897547182`.
- Package Android et bundle iOS : `com.tonnkama.app`.
- Activité Android : `com.tonnkama.app.MainActivity`.
- Schéma Facebook attendu : `fb1302423897547182`.
- Hash du certificat debug local inspecté : `Xo8WBi6jzSxKDVR4drqm84yr9iU=`.

À fournir ou vérifier dans les consoles Meta/Firebase :

1. Client Token public Meta, absent des fichiers d'environnement inspectés.
2. Enregistrement de la plateforme Android avec package, activité et hash debug.
3. Hashes des certificats release et Google Play App Signing utilisés à la distribution.
4. Enregistrement de la plateforme iOS avec le bundle ci-dessus et schéma Facebook.
5. Configuration du fournisseur Facebook Firebase, URI de redirection, permissions et
   comptes de test autorisés. Le secret reste exclusivement dans les configurations serveur.

Variables mobile : `EXPO_PUBLIC_FACEBOOK_APP_ID`,
`EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`, `EXPO_PUBLIC_FACEBOOK_LINKING_ENABLED`.
Le flag reste `false` tant que la configuration et les essais réels ne sont pas validés.
L'activation exige les deux valeurs publiques ; elle configure le plugin et l'autolinking.
Exécuter alors un prebuild Expo et reconstruire les binaires Android/iOS : une simple
mise à jour JavaScript ne suffit pas. Les mêmes variables doivent être présentes au
prebuild, à la compilation native et au bundling JS.

Le SDK n'est pas lié nativement tant que le flag est désactivé. La collecte publicitaire
et la journalisation automatique des événements sont désactivées dans la configuration.

## Validation et limites

Tests ajoutés : préférences (six champs, utilisateur absent), persistance du thème et
échec de stockage, navigation et gardes, formulaire de confirmation, association au même
UID, changement de session pendant OAuth, erreurs et échec partiel de notification.
Tests API : NextAuth préservé, Firebase valide, jetons absents/invalides, UID client ignoré.

La liaison réelle Google n'est pas certifiée par les mocks Jest. Facebook reste préparé
mais **non validé fonctionnellement**, sans credentials inventés. Les E2E OAuth nécessitent
un compte de test et les consoles correctement configurées. Aucun compte de production
n'a été modifié pour valider ces parcours. iOS n'a pas fait l'objet d'un build dans ce lot.

Les changements précédents de `NotificationsScreen` et `SearchRequestsScreen` sont hors
périmètre et ont été conservés. Aucun commit, push ou déploiement effectué.

### Résultats du 17 octobre 2026

- Mobile ciblé : 7 suites, 51 tests réussis.
- API notification : 1 suite, 9 tests réussis.
- Mobile complet : 56 suites, 55 réussies ; 394/395 tests réussis. Échec intermittent
  `_bezier is not a function` dans `LocationSelect` (animation native/Jest). Une exécution
  précédente rencontrait la même erreur dans `EditListingScreen`, qui repasse isolément.
  La suite complète n'est donc pas déclarée verte.
- TypeScript mobile et Web : vérifications réussies.
- `git diff --check` : réussi. Pas de script lint mobile configuré.
- Android `assembleDebug` arm64 : réussi ; APK installé sur l'émulateur.
- Validation visuelle/E2E non terminée : l'émulateur affiche « System UI isn't responding ».
  Aucun E2E de liaison OAuth réelle ni modification d'un compte de production effectué.
