# Build iOS local bloqué — incompatibilité Xcode 26.1 / Expo SDK 57 (2026-09)

**Contexte** : premier scaffold de `apps/mobile` (Expo + React Native Firebase + React
Navigation + Sentry), build natif local via `npx expo run:ios --device "iPhone 17"`
(CocoaPods + Xcode, pas EAS Build cloud).

## Ce qui a été corrigé pendant ce scaffold

1. **`@react-native-firebase/app` config plugin introuvable** — `Cannot find module
   '@expo/config-plugins'`. Le plugin le résout par résolution Node classique depuis son
   propre dossier, pas hissé automatiquement dans ce monorepo. Corrigé en ajoutant
   `@expo/config-plugins` comme dépendance directe de `apps/mobile`.
2. **CocoaPods : `SPM + static linkage is not supported`** — `expo-build-properties` était
   configuré en `useFrameworks: "static"` (habitude des anciennes versions de
   react-native-firebase). La version installée (26.4.0) résout Firebase iOS via Swift
   Package Manager en interne, incompatible avec le linkage statique. Corrigé :
   `useFrameworks: "dynamic"` dans `app.json`.
3. **`@react-native-firebase/auth` API "default export"** — la v26 est passée à l'API
   modulaire façon Firebase JS v9+ (`getAuth()`, `signInWithEmailAndPassword(auth, ...)`,
   `onAuthStateChanged(auth, cb)`) au lieu de `import auth from '...'; auth().signIn(...)`.
   Corrigé dans `src/api/client.ts`, `src/hooks/useAuthState.ts`,
   `src/screens/auth/SignInScreen.tsx`, `src/screens/ProfileScreen.tsx`.

## Ce qui reste bloqué : bug amont dans `expo-modules-jsi@57.0.8`

`expo-modules-core@57.0.16` (la dernière version stable au moment du scaffold) épingle
`expo-modules-jsi: "~57.0.8"` — et **57.0.8 est la dernière version stable publiée** de ce
paquet (rien entre 57.0.8 et les canaries `58.0.0-canary-*`). Son build C++/Swift
(`apple/scripts/build-xcframework.sh`, invoqué automatiquement par CocoaPods) échoue avec
Xcode 26.1 :

### Corrigé par patch direct dans `node_modules` (temporaire, à re-patcher après un `npm install` propre tant qu'Expo n'a pas publié de correctif)

- **`weak let runtime: JavaScriptRuntime?` invalide** (13 occurrences dans
  `apple/Sources/ExpoModulesJSI/Runtime/**/*.swift`) — `weak` exige `var`, pas `let`, sur
  cette version du compilateur Swift. Remplacé partout par `weak var`.
- **Sauf sur les 2 classes `Sendable`** (`JavaScriptError`, `JavaScriptValue`) — `weak var`
  y échoue à son tour ("stored property... is mutable" — une classe `Sendable` exige des
  champs immuables). Corrigé avec `nonisolated(unsafe) weak var`, exactement le même
  traitement que le champ voisin `pointee` dans ces mêmes fichiers.

### Toujours bloquant, non résolu

`apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h:63` et `:71` :

```
'RuntimeScheduler' cannot be annotated with either SWIFT_RETURNS_RETAINED or
SWIFT_RETURNS_UNRETAINED because it is not returning a SWIFT_SHARED_REFERENCE type
```

La classe **est** bien annotée `SWIFT_SHARED_REFERENCE(retainRuntimeScheduler,
releaseRuntimeScheduler)` juste après son accolade fermante (pattern standard), avec les
deux fonctions `retain`/`release` définies plus bas dans le même fichier — syntaxiquement
correct. Essayé sans succès : ajouter une déclaration anticipée des deux fonctions avant la
classe (le compilateur ne s'en satisfait pas non plus). Tout se passe comme si le
ClangImporter de ce Xcode ne reconnaissait pas encore la classe comme
"SWIFT_SHARED_REFERENCE" au moment où il traite les attributs des constructeurs déclarés à
l'intérieur du corps de la classe — sans accès direct au changelog Swift/Xcode 26.1 pour
confirmer si c'est une régression connue ou un changement de règle du compilateur.

## Pistes pour la suite (aucune tentée davantage cette session, faute de temps)

1. **Attendre un correctif Expo** — `weak let` cassé pour tout le monde sur ce Xcode est le
   genre de bug qu'Expo corrige vite ; revérifier `npm view expo-modules-jsi versions`
   régulièrement.
2. **`patch-package`** — installé (`devDependencies`) mais `npx patch-package` plante lui
   -même (`MODULE_NOT_FOUND` dans `createIssue.js`, probablement une dépendance manquante
   de patch-package dans ce monorepo) avant d'avoir pu générer le fichier `.patch` — les 3
   correctifs ci-dessus sont donc REELLEMENT appliqués dans `node_modules` mais PAS encore
   automatiquement réappliqués après un `npm install` frais. À refaire fonctionner, ou
   écrire le `.patch` à la main.
3. **Xcode plus ancien** — si un Xcode antérieur à 26.1 est disponible/installable
   (`xcode-select`), c'est probablement la façon la plus fiable de débloquer complètement
   en attendant le correctif amont — pas fait ici (téléchargement conséquent, décision à
   valider avec l'utilisateur avant de lancer).
4. **`expo-modules-jsi@58.0.0-canary-*`** — pourrait déjà contenir le correctif (canary =
   développement actif), mais une prérelease n'est pas un choix à committer pour de vrai,
   seulement un test ponctuel pour confirmer/infirmer l'hypothèse.

## État à date

- `tsc --noEmit` : propre (aucune erreur dans le code applicatif écrit cette session).
- Build natif iOS local : passé de 15 erreurs de compilation à 2, toutes dans du code Expo
  interne (`expo-modules-jsi`), aucune dans le code de `apps/mobile` lui-même.
- Aucun run réel dans le simulateur obtenu cette session — bloqué par le point ci-dessus.
