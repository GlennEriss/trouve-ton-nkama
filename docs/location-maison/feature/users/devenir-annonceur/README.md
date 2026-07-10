# Devenir Annonceur - Index

## Documents

- Specification fonctionnelle: `FEATURE-004-DEVENIR-ANNONCEUR.md`
- Suivi d'avancement: `PROGRESSION.md`
- Diagramme de sequence: `devenir-annonceur-sequence-diagram.puml`
- Diagramme d'activite: `devenir-annonceur-activity-diagram.puml`

## Perimetre

Cette feature couvre la transition d'un compte `User` vers un compte `Announcer` sans perdre les droits `User`:

- activation du role `Announcer`
- conservation du role `User`
- validation des preconditions metier
- traçabilite (logs + audit)

## Hors perimetre

- creation/edition detaillee du profil annonceur (feature dediee)
- downgrade `Announcer -> User`
- administration des roles
