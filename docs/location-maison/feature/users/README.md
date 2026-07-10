# Users - Index Documentation

Cette section centralise la documentation des features liees au domaine `users`.

## Sous-features

- Gestion du profil: `gestion-du-profil/README.md`
- Modifier ses informations: `gestion-du-profil/modifier-ses-informations/README.md`
- Verifier numero de telephone: `gestion-du-profil/verifier-numero-telephone/README.md`
- Activites du compte: `gestion-du-profil/activites-du-compte/README.md`
- Nouvelles annonces: `gestion-du-profil/nouvelles-annonces/README.md`
- Devenir annonceur: `devenir-annonceur/README.md`

## Rappel RBAC (scope courant)

- Role `User`: acces aux fonctionnalites profil utilisateur.
- Role `Announcer`: conserve tous les droits `User` + fonctionnalites annonceur.
- Role `Admin`: hors perimetre de cette section.

## References UML

- Use cases utilisateur: `../../uml/use-cases-utilisateur.puml`
- Use cases annonceur: `../../uml/use-cases-annonceur.puml`
