# Progression FEATURE-006 : Favoris Annonces

> **Branche implementation** : `develop`  
> **Objectif** : notifier les changements d'annonces en favoris (update/suppression).

---

## Checklist

| Element | Fait | A faire |
|--------|------|---------|
| Cadrage fonctionnel point 4 | ✅ | — |
| Documentation feature | ✅ | — |
| Trigger Cloud Function update | ✅ | — |
| Trigger Cloud Function delete | ✅ | — |
| Cleanup automatique favoris | ✅ | — |
| Tests unitaires policy | ✅ | — |
| Tests integration trigger end-to-end | — | ⬜ |

---

## Phases

1. Cadrage
- [x] definir les evenements et champs surveilles
- [x] definir regle de preference `isFavoris`

2. Implementation
- [x] policy de detection de changements pertinents
- [x] trigger `onUpdate(properties/{propertyId})`
- [x] trigger `onDelete(properties/{propertyId})`
- [x] nettoyage automatique `users.favoris`

3. Qualite
- [x] tests unitaires policy (functions)
- [ ] tests integration firestore + trigger

---

*Derniere mise a jour : 2026-03-07*
