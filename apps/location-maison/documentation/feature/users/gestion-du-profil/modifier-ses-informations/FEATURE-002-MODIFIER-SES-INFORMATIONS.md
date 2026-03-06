# FEATURE-002 - Modifier Ses Informations

## 1. Contexte

La route `http://localhost:3000/profil/informations` existe deja mais ne respecte pas encore le niveau attendu:

- design desktop peu coherent avec le langage visuel actuel de la plateforme
- logique metier profile encore embarquee dans des composants UI legacy
- couverture fonctionnelle partielle par rapport au use case UML

Reference UML:

- `documentation/uml/use-cases-utilisateur.puml` (`UC_EditProfile`, `UC_EditName`, `UC_EditBirthdate`, `UC_EditPhone`, `UC_EditCountry`, `UC_Avatar`)

## 2. Audit de l'existant

Points d'entree:

- `src/app/(protected)/profil/informations/page.tsx`
- `src/components/profil/FormPersonalInformation.tsx`
- `src/components/profil/CardUserProfil.tsx`

Constats techniques:

1. Logique metier dans la couche presentation
- le composant appelle directement `updateUser` (DB) et `useSession().update`.
- absence d'un service/hook feature dedie `profile-management`.

2. Couverture fonctionnelle incomplète
- en pratique, seule la modification du telephone est active.
- nom, prenom, date et email sont affiches mais en lecture seule.
- `country` est force a `GA` dans la mise a jour, non pilote par un vrai flux metier.

3. Incoherences UI/UX
- desktop: composition visuelle tres utilitaire, non alignee avec la direction modernisee (`auth/ui/v1`).
- duplication de composants legacy et modernes (`InputForm` + `InputFormApp`, `DateSelectForm` + `DateSelect`).
- hierarchy visuelle faible (espacements, sections, CTA, feedback etat).

4. Testabilite limitee
- couplage fort composant <-> DB rend les tests unitaires plus fragiles.
- manque de contrat service/erreur explicite pour les cas d'echec.

## 3. Problemes design (focus desktop/tablette)

Problemes observes:

- page "Informations personnelles" sans layout premium/coherent avec signup/signin.
- pas de sectionnement clair: `Identite`, `Contact`, `Securite`, `Actions`.
- CTA de sauvegarde manque de priorisation visuelle.
- experience non harmonisee entre desktop et mobile.

Impact:

- baisse de confiance utilisateur sur un ecran sensible (profil personnel).
- perception de produit "non fini" sur desktop.
- dette UX qui ralentit la suite des features user.

## 4. Cible fonctionnelle V1

1. Edition profil couvrant le use case UML
- prenom, nom, date de naissance, telephone, pays.
- email affiché en lecture seule (geré par auth provider), avec mention claire.

2. Validation et erreurs
- validation schema unique (Zod) pour la feature.
- erreurs metier explicites et toasts coherents.

3. Synchronisation session
- session NextAuth mise a jour apres succes.
- fallback propre si sync session echoue apres persistance DB.

4. Design coherent plateforme
- desktop/tablette/mobile alignes avec le style des ecrans auth modernes.

## 5. Architecture cible (feature-based)

Arborescence cible:

- `src/features/users/profile-management/services/`
- `src/features/users/profile-management/hooks/`
- `src/features/users/profile-management/ui/v1/`
- `src/features/users/profile-management/__tests__/`

Regle:

- les pages `app/` restent des entrypoints.
- la logique d'update profil sort de `src/components/profil/*`.

## 6. Plan de refactoring

Phase A - Extraction metier

1. creer `profile-management.service.ts`
2. definir types d'entree/sortie + erreurs metier
3. encapsuler update DB + update session

Phase B - Hook applicatif

1. creer `useProfileInformationUpdate.ts`
2. gerer `loading/error/success`
3. centraliser mapping erreurs -> messages UI

Phase C - UI v1

1. creer `ProfileInformationFormModern.tsx`
2. composition responsive desktop/tablette/mobile
3. design system coherent avec auth modern

Phase D - Migration progressive

1. brancher `/profil/informations` sur la nouvelle UI v1
2. conserver temporairement composants legacy si necessaire
3. supprimer legacy apres stabilisation

## 7. Criteres d'acceptation

1. Fonctionnel
- un `User` et un `Announcer` peuvent modifier leurs informations autorisees.
- la session reflete les nouvelles donnees apres sauvegarde.

2. UX/UI
- desktop/tablette/mobile visuellement coherents avec le reste de la plateforme.
- messages de succes/erreur clairs.

3. Architecture
- pas d'appel DB direct depuis la nouvelle UI.
- logique metier testable dans services/hooks feature.

4. Qualite
- tests unitaires service + hook.
- tests integration formulaire principal.

## 8. Hors scope de cette sous-feature

- verification OTP telephone
- devenir annonceur
- administration des profils
- refonte complete de tout `/profil` (hors ecran informations)

