# Lot 10A - Routes API et palier 55 %

Date d'execution : 2026-07-23

## Objectif

Porter les lignes et instructions de l'application de 50 % a 55 % en ciblant le plus gros
levier identifie au demarrage du Lot 10 : les routes serveur `src/app/api/**`, logique
mockable sans navigateur, sans exclure de fichiers du rapport.

## Perimetre teste

- forwarders analytics : presence, search, ads/slot-events, adsense-report ;
- assistant IA (`ai/assistant/chat`) : auth, credits, debit transactionnel, pannes Gemini ;
- localisation serveur : recherche Photon, suggestions Redis, geocode/geocode search,
  cluster cities/streets/provinces, OSM Gabon, route legacy a cache memoire ;
- authentification par email : verification, envoi de verification, reset et demande de
  reset de mot de passe ;
- paiements et cadeaux : `credits/purchase`, webhook Airtel, `gifts/initiate`,
  statut de transaction cadeau ;
- annonces et reels : compteurs par province/type/resume, annonces promues, feed reels,
  reliquat de `reels/route.ts` (creation, modification, suppression, cas limites) ;
- divers : upload de visuel publicitaire, activation du role annonceur, notification
  d'activite de compte, clic Algolia Insights, image de partage `og:image`, places/details ;
- couche donnees : `property-statistics.db.ts` (tracking de vues, interactions, lecture des
  statistiques), quasiment a 0 % en debut de lot.

Les tests exercent les succes, erreurs metier, pannes reseau, configurations manquantes,
validations Zod et cas limites pertinents (idempotence, quirks de schema, autorisation).

## Resultat

| Metrique | Resultat | Seuil CI |
| --- | ---: | ---: |
| Lignes | 55,06 % (50 080 / 90 946) | 55 % |
| Instructions | 55,06 % (50 080 / 90 946) | 55 % |
| Fonctions | 63,20 % (1 173 / 1 856) | 50 % |
| Branches | 72,49 % (6 633 / 9 150) | 60 % |

- 154 suites passees et 1 suite ignoree (emulateur Firestore, hors emulator) ;
- 1 047 tests passes et 6 ignores ;
- environ 35 nouveaux fichiers de tests, plus de 350 nouveaux cas ;
- seuil CI releve a 55 % pour les lignes et instructions (`jest.config.ts` et
  `scripts/check-location-maison-coverage.cjs`, profil `application`) ; fonctions et branches
  inchangees a ce palier, deja tres au-dessus du seuil.

## Principe anti-faux-vrai applique

Conformement au principe inscrit dans `PLAN-DE-TESTS.md`, chaque test ajoute appelle le vrai
handler exporte par la route et n'assertit que sur la sortie reelle (code HTTP, JSON, entetes,
effets sur les mocks d'infrastructure). Seules les frontieres sont mockees : SDK Firebase
(client et admin), `next/server`, Redis, cache applicatif, fetch upstream, `next-auth`. Aucun
test ne mocke le module qu'il pretend tester.

Deux quirks de schema latents ont ete decouverts et figes par des tests dedies plutot que
corriges silencieusement (hors scope de ce lot, sans impact production confirme) :

- `GET /api/location/search` et `GET /api/location/suggestions` renvoient 400 quand le
  parametre `limit` est absent de l'URL, car `z.string().optional()` recoit `null` (valeur
  de `URLSearchParams.get()` pour une cle absente) plutot que `undefined`, empechant la
  valeur par defaut de s'appliquer. Sans consequence connue : le seul appelant de chaque
  route envoie toujours `limit` explicitement.

## Blocage externe corrige en cours de lot

Trois suites existantes (`auth-config.test.ts`, `signin-form-modern.test.tsx`,
`profile-and-announcer-server.test.ts`) ont commence a echouer en parallele de ce lot, a
cause d'un chantier concurrent sur l'authentification par telephone (non lie au Lot 10) :

- `src/lib/node/slow-buffer-compat.ts` utilisait `createRequire(import.meta.url)` : sous
  ts-jest (sortie CommonJS), `import.meta.url` n'est pas reecrit et le `require` local entre
  en collision avec celui du wrapper CommonJS de Jest. Aligne sur le shim jumeau deja
  fonctionnel de `functions/src/node/slow-buffer-compat.ts` (le `require` ambiant suffit, ce
  module n'etant charge que cote Node) ;
- `PhoneAuthModal` importe `usePhoneOtpAuth` par son chemin direct plutot que via le barrel
  deja mocke dans `signin-form-modern.test.tsx`, laissant le vrai hook tirer `next-auth/react`
  (ESM non transforme par Jest) ; mock ajoute pour ce hook ;
- les mocks de `auth-config.test.ts` et `profile-and-announcer-server.test.ts` n'avaient pas
  suivi deux evolutions reelles et intentionnelles du code (le nouveau provider `phone` dans
  `auth.config.ts`, et le garde-fou `findById` + `normalizePhoneNumberForFirebase` dans
  `complete-profile.service.ts`, qui preserve le statut de verification OTP d'un numero
  inchange). Mocks completes et 3 tests ajoutes pour couvrir explicitement ce comportement.

Ces corrections ont ete verifiees avant et apres (test unitaire mis au rouge puis restaure)
et n'entrent pas dans le perimetre metier du Lot 10, mais etaient necessaires pour garder une
suite entierement verte avant de relever la CI.

## Verification

```bash
cd apps/location-maison
npm run test:ci
npm run check:types
```

Le rapport machine est genere dans `apps/location-maison/__tests__/coverage/coverage-summary.json`
et le rapport navigable dans `apps/location-maison/__tests__/coverage/lcov-report/`.

## Reporte au Lot 10B ou a une prochaine iteration

- les tests sur emulateur Firestore reel pour les routes critiques (credits, idempotence),
  prevus par le principe anti-faux-vrai, n'ont pas ete ajoutes dans ce lot faute de temps ;
  a traiter avant ou pendant le Lot 10B ;
- `property-statistics.db.ts` est passe de 38,3 % a 88,02 % de lignes ; le reliquat (fonctions
  de calcul de metriques sur des branches d'erreur rares) reste une dette mineure ;
  les plus gros volumes non couverts sont maintenant concentres sur `src/components/**`
  (home-page, preview-property, search), cible du Lot 10B.
