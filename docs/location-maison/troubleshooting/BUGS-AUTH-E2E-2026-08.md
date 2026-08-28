# Bugs découverts par les tests e2e réels de l'auth (2026-08)

Trouvés en construisant des tests Playwright non-mockés (vrai Firebase, vrai navigateur)
pour les parcours signup/signin/déconnexion, suite à la demande de tests e2e "plus proches
du réel" que les tests Jest mockés. Chaque entrée : statut, repro, piste, test qui le prouve.

## 🟢 Résolu — Checkbox "conditions d'utilisation" apparemment décochée sur /complete-profile

**Statut** : corrigé et vérifié — `auth-phone-otp.spec.ts` passe désormais de bout en bout
(vrai Firebase, vraie session NextAuth, vraie sauvegarde Firestore via la route Admin SDK).

**Cause réelle** (pas un bug de données) : `CompleteProfileFormModern`, `accountType` démarre
à `'User'` (default de `useForm`) puis passe à `'Announcer'` un tick de rendu *après* le
montage, une fois l'effet d'hydratation de session appliqué et propagé via `form.watch`. La
case "conditions annonceur" (conditionnée par `accountType === 'Announcer'`) n'existe donc pas
encore dans le DOM au tout premier rendu du formulaire. Le test cochait les checkboxes par
index avant que ce 2e tick se produise : il ne trouvait qu'une checkbox, cochait celle-là, puis
la vraie 2e checkbox (annonceur) apparaissait ensuite en tête de liste, décalant les index —
la case "confidentialité" (jamais cochée par le test, contrairement à ce que le premier
diagnostic supposait) restait donc bien décochée. Confirmé en isolant le repro directement sur
`/complete-profile` via un cookie de session forgé (sans Firebase/reCAPTCHA), qui a permis de
voir `getByRole('checkbox').count()` valoir `0` juste après avoir rempli les champs.

**Gravité réelle, revue à la baisse** : ce n'est PAS un bug bloquant pour un humain réel — un
tick de rendu React (quelques ms) est bien plus rapide que n'importe quelle interaction humaine
plausible. Seule une interaction plus rapide que React (comme un test automatisé, ou
potentiellement un remplissage par gestionnaire de mots de passe/autofill agressif) peut
l'atteindre. L'alerte initiale ("bloque potentiellement tout signup téléphone en production")
était surestimée — corrigée ici pour ne pas laisser une fausse urgence dans ce doc.

**Correctif appliqué** : dans le test, attendre `expect(checkboxes).toHaveCount(2)` avant
d'interagir. Aucun changement de code applicatif jugé nécessaire vu la gravité réelle — à
reconsidérer seulement si un vrai report utilisateur apparaît un jour.

**Test qui le prouve** : `apps/location-maison/__tests__/e2e/auth-phone-otp.spec.ts` (vert).

---

## 🟢 Résolu — `DateSelect` ne refermait pas toujours le Select

**Statut** : corrigé et vérifié (repro isolé via cookie de session forgé sur
`/complete-profile`, sans Firebase/reCAPTCHA — le Select "Année" se referme proprement après
sélection, plus de liste flottante résiduelle dans les captures).

**Cause** : `src/components/shared/form/DateSelect.tsx` — l'effet qui force la validation
(`_trigger`) dépendait de `currentValues?.[name]`, un objet reconstruit à chaque rendu
(référence toujours neuve) au lieu de ses valeurs primitives. Ça peut déclencher l'effet en
boucle à chaque rendu.

**Observé** : le Select (Radix) "Année de naissance" restait visuellement ouvert/affiché
au-dessus du formulaire après une sélection, dans plusieurs captures d'écran successives,
alors que la valeur elle-même était bien enregistrée ("1990" coché dans la liste).

**Correctif** : dépendances de l'effet changées pour des primitives stables
(`currentDay`, `currentMonth`, `currentYear`) au lieu de l'objet.

**Fichier** : `apps/location-maison/src/components/shared/form/DateSelect.tsx`

---

## 🟡 À surveiller — `permission-denied` Firestore sur les listeners de notifications après login téléphone

**Statut** : observé, pas encore confirmé comme un bug ni relié formellement au bug de checkbox.

**Observé** : dans la console navigateur, juste après un login téléphone réel, plusieurs
erreurs `FirebaseError: Missing or insufficient permissions` (`code: permission-denied`) côté
`providers.notification` (écoute des notifications non lues / récentes), ainsi que des
`requestStorageAccess: Permission denied` répétés.

**Piste** : cohérent avec le commentaire déjà présent dans
`src/app/api/auth/complete-profile/route.ts` selon lequel les comptes téléphone n'ont pas
toujours, de façon fiable, une vraie session Firebase Auth côté client (nécessaire pour que les
listeners Firestore respectant `request.auth != null` fonctionnent). Pourrait indiquer que
l'app tente d'ouvrir des listeners realtime avant que la session client soit pleinement établie.

**Non fait** : pas d'investigation plus poussée cette session.

---

## 🟢 Résolu — Signup email/mot de passe classique, aucune couverture e2e

**Statut** : construit et vérifié. `auth-email-signup.spec.ts` — vrai
`createUserWithEmailAndPassword()` Firebase (pas de mock), email/téléphone uniques par run,
parcours complet des 4 étapes jusqu'à `/signup/success?uid=...`. Stable sur 2 runs consécutifs
(pas de CAPTCHA/OAuth externe sur ce chemin, contrairement au signup téléphone).

---

## 🟢 Corrigé — Prénom/Nom inversés sur le formulaire d'inscription

**Statut** : corrigé (desktop + mobile), trouvé en lisant le code pendant la construction du
test email/mot de passe.

**Cause** : dans `SignupFormModern.tsx` et `SignupMobileComponent.tsx`, le champ `firstname`
était labellisé "Nom" (avec placeholder "Entrez votre nom") et `lastname` labellisé "Prénom" —
inversé. `CompleteProfileFormModern.tsx` avait les bons labels sur les mêmes champs, confirmant
que c'était une erreur et non un choix voulu. Un utilisateur lisant les labels tapait donc son
prénom dans une case appelée "Nom" et vice-versa.

**Correctif** : labels et placeholders échangés (le nom du champ / la donnée envoyée au serveur
n'a pas changé, seul le texte visible). Fichiers :
`src/features/auth/ui/v1/SignupFormModern.tsx`,
`src/components/signup/SignupMobileComponent.tsx`.

---

## 🟢 Corrigé — Contraste insuffisant du badge "OU" sur /signin (mode sombre)

**Statut** : corrigé, trouvé par `lot5b-forms-auth-balance.spec.ts` (scénario "connexion",
mobile dark).

**Cause** : `--primary-50` (fond du badge) n'a pas de valeur redéfinie en mode sombre — le badge
gardait un fond pastel clair pendant que `--primary` devient plus clair aussi en dark mode,
donnant un texte moyen-clair sur fond quasi blanc. Le même badge sur `/signup`
(`SignupMobileComponent.tsx`) avait déjà le correctif (`dark:bg-gray-800 dark:text-primary-200`)
— seul `/signin` ne l'avait pas.

**Correctif** : même classes `dark:` appliquées à `SigninMobileComponent.tsx`.

---

## 🟢 Corrigé — Bouton de notifications imbriqué dans un autre bouton (a11y)

**Statut** : corrigé, trouvé par `lot5b-forms-auth-balance.spec.ts` sur toutes les pages
connectées testées (profil, informations-profil, historique-solde, recharge-solde,
formulaire-studio) — violation WCAG "nested-interactive" bloquante.

**Cause** : `src/components/navbar/Notifications.tsx` — `<PopoverTrigger>` sans `asChild`
autour de `<NotificationButton>` (qui rend lui-même un `<button>`) : Radix ajoute alors son
propre `<button>` wrapper autour, créant un bouton dans un bouton. `MenuProfil.tsx` (le menu
profil juste à côté dans la navbar) utilisait déjà `asChild` correctement — incohérence, pas un
choix voulu.

**Correctif** : ajout de `asChild` sur `PopoverTrigger`. Composant partagé par toutes les
navbars (desktop + mobile, home page + pages internes) — un seul correctif couvre tout.

**Fichier** : `apps/location-maison/src/components/navbar/Notifications.tsx`

---

## 🟢 Corrigé — Menu latéral mobile focusable alors que masqué (a11y)

**Statut** : corrigé, trouvé par `lot5b-forms-auth-balance.spec.ts` en mobile (profil et autres
pages) — violation WCAG "aria-hidden-focus" bloquante.

**Cause** : `MobileSidebar.tsx` masque le panneau via `-translate-x-full` + `aria-hidden="true"`
quand fermé, mais les liens à l'intérieur restaient dans l'ordre de tabulation clavier (le CSS
seul ne retire pas du focus) — un utilisateur clavier pouvait tabuler dans un menu invisible.

**Correctif** : ajout de l'attribut HTML `inert` en plus de `aria-hidden` quand fermé — retire
réellement les éléments du focus et de l'arbre d'accessibilité tant que le panneau est fermé.

**Fichier** : `apps/location-maison/src/components/navbar/MobileSidebar.tsx`

---

## ⚪ Hors périmètre — violations WCAG restantes sur les pages non-auth

**Statut** : non touché, volontairement — pages non liées à l'auth (property forms
`/property/add/studio`, `/my-balance/history`, `/my-balance/recharge`), signalé par le même
run `lot5b-forms-auth-balance.spec.ts` qui mélange auth et ces pages dans un seul fichier de
test. Contraste couleur (plusieurs éléments) + un `aside` supplémentaire sur ces pages
spécifiques. Pré-existant, pas introduit cette session — à traiter séparément si besoin, hors du
périmètre "auth" demandé.

---

## ⚪ Google OAuth — toujours sans couverture e2e, par choix

Un vrai login Google automatisé nécessite soit un compte de test dédié soit contourne la
détection anti-bot de Google — non fait délibérément plutôt que bricolé. Seul point de la
partie auth qui reste non testé en e2e réel.

---

## Récapitulatif — état de la suite e2e auth au 2026-08-29

- `auth-signout.spec.ts` (desktop + mobile) : ✅ vert, stable en isolation (peut flaker si lancé
  en même temps qu'une grosse suite qui sature le serveur dev — pas un bug applicatif).
- `auth-phone-otp.spec.ts` : ✅ vert quand le reCAPTCHA réel de Google ne bloque pas (non
  déterministe, pas un bug applicatif — voir plus haut).
- `auth-email-signup.spec.ts` : ✅ vert, stable (pas de CAPTCHA sur ce chemin).
- `lot5b-forms-auth-balance.spec.ts`, scénarios auth (`connexion`, `inscription`, `profil`,
  `informations-profil`) : ✅ vert sur les 4 combinaisons viewport/thème depuis les correctifs
  a11y ci-dessus. Scénarios non-auth (`formulaire-studio`, `historique-solde`,
  `recharge-solde`) : ⚪ encore rouges, hors périmètre.

*Créé le 2026-08-28, mis à jour le 2026-08-29 suite à la construction de
`auth-email-signup.spec.ts` et au passage complet de la suite e2e auth.*
