# Progression FEATURE-003 : Verifier Numero De Telephone

> **Branche cible implementation** : `feature/FEATURE-007-phone-verification`  
> **Objectif** : verifier un numero via OTP Firebase depuis `/verify-phone` en architecture feature-based.

---

## Checklist

| Element | Fait | A faire |
|--------|------|---------|
| Cadrage fonctionnel et RBAC | ✅ | — |
| Documentation feature | ✅ | — |
| Diagramme sequence OTP | ✅ | — |
| Module `src/features/users/phone-verification` | ✅ | — |
| Refactor page `/verify-phone` | ✅ | — |
| Bouton acces depuis `/profil` | ✅ | — |
| Warning perte statut verifie dans `/profil/informations` | ✅ | — |
| Tests unitaires service | ✅ | — |

---

## Phases

1. Documentation (terminee)
- [x] spec fonctionnelle
- [x] progression
- [x] sequence diagram

2. Implementation (terminee)
- [x] service + hook phone verification
- [x] UI v1 + wiring route
- [x] bouton profil
- [x] warning changement numero verifie

3. Qualite
- [x] tests unitaires service
- [ ] validation manuelle du parcours OTP

---

*Derniere mise a jour : 2026-03-06*
