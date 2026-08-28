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

## ⚪ Couverture manquante (pas des bugs, des trous de test)

- **Google OAuth signup/signin** : aucun test e2e. Un vrai login Google automatisé nécessite
  soit un compte de test dédié soit contourne la détection anti-bot de Google — non fait
  délibérément plutôt que bricolé.
- **Signup email/mot de passe classique** : aucun test e2e pour l'instant. Contrairement à
  Google, c'est faisable proprement (pas d'OAuth externe, pas de CAPTCHA) — juste pas encore
  construit.

---

*Créé le 2026-08-28, suite à la construction de `auth-phone-otp.spec.ts` et
`auth-signout.spec.ts`.*
