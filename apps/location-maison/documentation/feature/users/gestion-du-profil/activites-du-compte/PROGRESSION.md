# Progression FEATURE-004 : Activites Du Compte

> **Branche implementation** : `feature/FEATURE-010-account-activity-notifications`  
> **Objectif** : industrialiser les notifications d'activite compte (in-app + email critique).

---

## Checklist

| Element | Fait | A faire |
|--------|------|---------|
| Cadrage fonctionnel point 2 | ✅ | — |
| Documentation feature complete | ✅ | — |
| Diagramme de sequence | ✅ | — |
| Definition events + policy centrale | ✅ | — |
| Dispatcher notifications compte | ✅ | — |
| Branchement profile/security/services | ✅ | — |
| Templates email activite compte | ✅ | — |
| Tests unitaires + integration | ✅ (unitaires cibles) | ⬜ Integration large |

---

## Phases

1. Documentation (terminee)
- [x] spec fonctionnelle
- [x] progression
- [x] sequence diagram

2. Implementation (terminee v1)
- [x] event types + policy
- [x] dispatcher in-app/email
- [x] route API d'emission `/api/users/account-activity/notify`
- [x] triggers sur actions compte (profil, securite providers, reset password, verification telephone)

3. Qualite (terminee partielle)
- [x] tests unitaires policy
- [x] tests unitaires services relies (profil + verification telephone)
- [ ] tests integration end-to-end multi-canaux

---

*Derniere mise a jour : 2026-03-07*
