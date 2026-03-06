# Progression FEATURE-001 : Gestion Du Profil

> **Branche** : `develop`  
> **Objectif** : aligner la gestion du profil User/Announcer avec l'UML et refactoriser vers une architecture feature-based.

---

## Checklist rapide

| Element | Fait | A faire |
|--------|------|---------|
| Routes profil protegees | ✅ | — |
| Ecrans profil existants | ✅ | — |
| Mapping UML -> scope feature | ✅ | — |
| Sous-feature `modifier-ses-informations` documentee | ✅ | — |
| Sous-feature `verifier-numero-telephone` documentee | ✅ | — |
| Edition informations (V1: telephone + pays) | ✅ | — |
| Refactor vers `src/features/users/profile-management` | ✅ | — |
| Tests unitaires module profil | ✅ | — |
| Tests integration parcours profil | — | ⬜ |

---

## Phase 1 - Cadrage (Terminee)

- [x] Definir le perimetre RBAC (`User` + `Announcer`)
- [x] Exclure OTP telephone (feature dediee)
- [x] Documenter le mapping use cases UML

## Phase 2 - Extraction technique (A faire)

- [ ] Creer `src/features/users/profile-management`
- [ ] Deplacer logique metier profile hors des composants legacy
- [ ] Introduire service/hook profile-management

## Phase 3 - Stabilisation fonctionnelle (A faire)

- [ ] Couvrir tous les champs d'edition profil prevus par l'UML
- [ ] Uniformiser UX mobile/tablette/desktop
- [ ] Garantir mise a jour session apres edition

## Phase 4 - Qualite (A faire)

- [ ] Tests unitaires (services/hooks)
- [ ] Tests integration (edition profil + securite)
- [ ] Verification non-regression auth/providers

---

*Derniere mise a jour : 2026-03-06*
