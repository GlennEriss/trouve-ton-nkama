# Progression FEATURE-005 : Nouvelles Annonces

> **Branche implementation** : `feature/FEATURE-010-account-activity-notifications`  
> **Objectif** : activer la notification in-app des nouvelles annonces selon region/criteres.

---

## Checklist

| Element | Fait | A faire |
|--------|------|---------|
| Cadrage fonctionnel point 3 | ✅ | — |
| Documentation feature | ✅ | — |
| Policy de matching region/criteres | ✅ | — |
| Trigger Cloud Function idempotent | ✅ | — |
| Branchement automatique sur creation annonce | ✅ | — |
| Tests unitaires policy (functions) | ✅ | — |
| Tests integration full flow | — | ⬜ |

---

## Phases

1. Cadrage
- [x] definir regles v1
- [x] definir architecture cible

2. Implementation
- [x] policy de matching
- [x] trigger Cloud Function `onCreate(properties/{propertyId})`
- [x] dispatch in-app + dedupe

3. Qualite
- [x] tests unitaires policy
- [ ] tests integration Cloud Function + firestore

---

*Derniere mise a jour : 2026-03-07*
