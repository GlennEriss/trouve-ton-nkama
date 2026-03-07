# Gestion Du Profil - Index

## Documents

- Specification fonctionnelle: `FEATURE-001-GESTION-PROFIL.md`
- Suivi d'avancement: `PROGRESSION.md`
- Diagramme de sequence: `gestion-profil-sequence-diagram.puml`
- Diagramme d'activite: `gestion-profil-activity-diagram.puml`
- Sous-feature modifier ses informations: `modifier-ses-informations/README.md`
- Sous-feature verifier numero de telephone: `verifier-numero-telephone/README.md`
- Sous-feature activites du compte: `activites-du-compte/README.md`

## Perimetre

Cette sous-feature couvre la gestion du profil `User` (et donc aussi `Announcer`):

- consultation du profil
- edition des informations personnelles
- acces "connexion et securite"
- gestion des fournisseurs de connexion

## Hors perimetre

- verification OTP du telephone (feature dediee)
- notifications "activites du compte" (feature dediee)
- "devenir annonceur" (feature dediee: `../devenir-annonceur/README.md`)
- administration
