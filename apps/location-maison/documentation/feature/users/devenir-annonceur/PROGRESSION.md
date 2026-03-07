# Progression FEATURE-004 : Devenir Annonceur

> **Branche cible implementation** : `feature/FEATURE-008-devenir-annonceur`  
> **Objectif** : permettre la transition `User` -> `User + Announcer` avec parcours dedie, robuste et trace.

---

## Checklist

| Element | Fait | A faire |
|--------|------|---------|
| Cadrage fonctionnel RBAC | ✅ | — |
| Documentation feature complete | ✅ | — |
| Diagramme sequence | ✅ | — |
| Diagramme activite | ✅ | — |
| Design parcours UI (`/profil/devenir-annonceur`) | ✅ | — |
| Module `src/features/users/become-announcer` | ✅ | — |
| Route API `POST /api/users/become-announcer` | ✅ | — |
| Synchronisation session post-migration | ✅ | — |
| Tests unitaires service/hook | — | ⬜ |
| Tests integration parcours complet | — | ⬜ |

---

## Phases

1. Documentation (terminee)
- [x] specification fonctionnelle
- [x] progression
- [x] sequence diagram
- [x] activity diagram

2. Implementation metier
- [x] creer service `BecomeAnnouncerService`
- [x] gerer preconditions (auth + terms + role state)
- [x] mettre a jour roles en base (`User` conserve, `Announcer` ajoute)

3. Implementation applicative
- [x] creer hook `useBecomeAnnouncer`
- [x] creer UI v1 du parcours
- [x] brancher depuis `/profil`

4. API et session
- [x] implementer endpoint `POST /api/users/become-announcer`
- [x] rafraichir session apres succes

5. Qualite
- [ ] tests unitaires service/hook
- [ ] tests integration UI/API
- [ ] validation manuelle du flux en environnement dev

---

*Derniere mise a jour : 2026-03-06*
