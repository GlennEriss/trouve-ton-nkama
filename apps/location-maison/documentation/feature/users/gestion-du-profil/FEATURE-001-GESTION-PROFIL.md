# FEATURE-001 - Gestion Du Profil (Users)

## 1. Contexte

La plateforme dispose deja d'ecrans profil (`/profil`, `/profil/informations`, `/login-and-security`), mais la feature doit etre formellement cadree, alignee avec les use cases UML, puis refactorisee de maniere coherente.

References UML:

- `documentation/uml/use-cases-utilisateur.puml`
- `documentation/uml/use-cases-annonceur.puml`

Cas d'utilisation cibles (extraits UML):

- `UC_ViewProfile` Consulter son profil
- `UC_EditProfile` Modifier ses informations
- `UC_EditName` Modifier prenom/nom
- `UC_EditBirthdate` Modifier date de naissance
- `UC_EditPhone` Modifier numero de telephone
- `UC_EditCountry` Modifier pays
- `UC_ChangePwd` Changer mot de passe
- `UC_Security` Gerer la securite du compte
- `UC_Avatar` Ajouter/Modifier photo de profil

## 2. RBAC attendu

- Role `User`: acces complet a la gestion de profil utilisateur.
- Role `Announcer`: memes droits profil que `User` (heritage).
- Non connecte: aucun acces aux routes profil.
- Role `Admin`: hors scope de cette feature.

## 3. Routes fonctionnelles

- `/profil`: hub du profil.
- `/profil/informations`: edition des informations personnelles.
- `/login-and-security`: securite et providers (Google/Facebook/Credentials).

## 4. Scope fonctionnel V1

1. Consultation du profil
- afficher identite de l'utilisateur (nom, prenom, email, avatar, etat verification telephone).

2. Edition des informations personnelles
- edition prenom/nom/date de naissance/numero/pays.
- validation metier via schema formulaire.
- mise a jour session apres succes.

3. Securite du compte
- acces a la mise a jour du mot de passe.
- liaison des providers OAuth depuis l'espace securite.

4. Journalisation et erreurs
- erreurs metier affichees clairement.
- logs applicatifs structures pour incidents (`scope` + `context`).

## 5. Hors scope V1

- verification OTP telephone (feature dediee, deja sortie du scope auth signup/signin).
- migration "devenir annonceur".
- moderation / administration profil.

## 6. Existant observe (base technique)

Ecrans existants:

- `src/app/(protected)/profil/page.tsx`
- `src/app/(protected)/profil/informations/page.tsx`
- `src/app/(protected)/login-and-security/page.tsx`

Composants existants:

- `src/components/profil/ProfilInformations.tsx`
- `src/components/profil/ProfilDetails.tsx`
- `src/components/profil/FormPersonalInformation.tsx`
- `src/components/login-and-security/LoginAndSecurity.tsx`

Remarque importante:

- aujourd'hui, `FormPersonalInformation` met surtout a jour le numero de telephone; la couverture complete des use cases profil reste a finaliser.

## 7. Architecture cible (feature-based)

Arborescence cible:

- `src/features/users/profile-management/`
- `src/features/users/profile-management/services/`
- `src/features/users/profile-management/hooks/`
- `src/features/users/profile-management/ui/v1/`
- `src/features/users/profile-management/__tests__/`

Principe:

- extraire progressivement la logique profile depuis `src/components/profil/*` vers `src/features/users/profile-management/*`.
- conserver les pages `app/` comme points d'entree et non comme couche metier.

## 8. Critere d'acceptation

1. Acces
- utilisateur connecte (`User` ou `Announcer`) accede aux 3 routes profil.
- utilisateur non connecte est redirige vers signin.

2. Edition profil
- les champs cibles sont valides et sauvegardes sans regression session.
- message de succes/erreur coherent.

3. Securite
- changement mot de passe accessible.
- lien provider Google/Facebook fonctionnel sans casser les comptes credentials.

4. Qualite
- tests unitaires hooks/services profils.
- tests integration des parcours critiques.

## 9. Plan d'implementation

1. Cadrage + mapping UML -> composants/routes (ce document).
2. Creer le module `src/features/users/profile-management`.
3. Extraire et tester la logique d'edition profil.
4. Extraire et tester la logique "login and security".
5. Uniformiser UI mobile/tablette/desktop.
6. Ajouter tests integration sur flux profil.

## 10. Dependances

- `useCurrentUser`, `useSession`
- `updateUser` (DB layer)
- schemas Zod de profil
- middleware d'authentification/routage

