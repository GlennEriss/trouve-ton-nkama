# Annuaire des Features - Plateforme Location Maison Gabon

## Légende
- ⬜ Non commencée
- 🔄 En cours
- ✅ Réalisée
- ❌ Annulée / Reportée

---

## 🔐 Authentification

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Se connecter | 🔄 | feature/FEATURE-003-signin | 2026-03-05 | Implémentation principale terminée (UI + hook + gestion token/refresh), validation E2E restante |
| S'inscrire | ✅ | - | - | Existant |
| Se déconnecter | ✅ | - | - | Existant |
| Connexion Google | 🔄 | feature/FEATURE-003-signin | 2026-03-05 | Flux OAuth stabilisé (erreurs contrôlées + refresh token session), validation E2E restante |
| Connexion Facebook | ✅ | - | - | Existant |
| Vérification email | ✅ | - | - | Existant |
| Réinitialisation mot de passe | ✅ | - | - | Existant |
| **Devenir Annonceur** | ⬜ | - | - | Migration Utilisateur → Annonceur |

---

## 🏠 Propriétés (Annonces)

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Créer une annonce | ✅ | - | - | Existant (à refactoriser selon nouvelle architecture) |
| Modifier une annonce | ✅ | - | - | Existant |
| Supprimer une annonce | ✅ | - | - | Existant |
| Consulter mes annonces | ✅ | - | - | Existant |
| Utiliser l'assistant IA | ✅ | - | - | Existant |
| Promouvoir une annonce (Featured) | ⬜ | - | - | À implémenter |
| Promouvoir une annonce (Trending) | ⬜ | - | - | À implémenter |
| Booster une annonce | ⬜ | - | - | À implémenter |
| Voir statistiques d'une annonce | ⬜ | - | - | À implémenter |

---

## 🔍 Recherche

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Recherche basique | ✅ | - | - | Existant |
| Recherche avancée | ✅ | - | - | Existant (à améliorer) |
| Filtres (type, prix, localisation) | ✅ | - | - | Existant |
| Navigation sur carte | ✅ | - | - | Existant |
| Sauvegarder une recherche | ⬜ | - | - | À implémenter |
| Alertes de recherche | ⬜ | - | - | À implémenter |
| Comparaison de propriétés | ⬜ | - | - | À implémenter |

---

## ⭐ Favoris

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Ajouter aux favoris | ✅ | - | - | Existant |
| Retirer des favoris | ✅ | - | - | Existant |
| Consulter mes favoris | ✅ | - | - | Existant |

---

## 💳 Crédits & Paiements

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Consulter son solde | ⬜ | - | - | À implémenter (nouveau système) |
| Acheter des crédits | ⬜ | - | - | À implémenter (Airtel Money) |
| Sélectionner un pack | ⬜ | - | - | À implémenter |
| Payer via Airtel Money | ⬜ | - | - | À implémenter |
| Consulter l'historique | ⬜ | - | - | À implémenter |
| Filtrer historique (Achats/Dépenses) | ⬜ | - | - | À implémenter |

---

## 🔔 Notifications

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Consulter ses notifications | ✅ | - | - | Existant |
| Marquer comme lue | ✅ | - | - | Existant |
| Configurer les préférences | ✅ | - | - | Existant |

---

## 👤 Profil Utilisateur

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Gestion du profil (refactoring feature-based) | 🔄 | develop | 2026-03-06 | Cadrage cree dans `documentation/feature/users/gestion-du-profil/` |
| Modifier ses informations (refonte UX/UI desktop + architecture) | 🔄 | develop | 2026-03-06 | Analyse creee dans `documentation/feature/users/gestion-du-profil/modifier-ses-informations/` |
| Consulter son profil | ✅ | - | - | Existant |
| Modifier ses informations | ✅ | - | - | Existant |
| Changer son mot de passe | ✅ | - | - | Existant |
| Modifier photo de profil | ✅ | - | - | Existant |

---

## 👔 Profil Annonceur

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Modifier profil public annonceur | ⬜ | - | - | À implémenter |
| Ajouter logo/photo entreprise | ⬜ | - | - | À implémenter |
| Renseigner description professionnelle | ⬜ | - | - | À implémenter |
| Ajouter liens réseaux sociaux | ⬜ | - | - | À implémenter |

---

## 🛠️ Administration

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Gérer les packs de crédits | ⬜ | - | - | À implémenter |
| Attribuer des crédits manuellement | ⬜ | - | - | À implémenter |
| Voir toutes les transactions | ⬜ | - | - | À implémenter |
| Gérer les remboursements | ⬜ | - | - | À implémenter |
| Configuration pays supportés | ✅ | - | - | Existant |
| Gestion données géographiques | ✅ | - | - | Existant |

---

## 📊 Statistiques

| Feature | Statut | Branche | Date | Notes |
|---------|--------|---------|------|-------|
| Statistiques annonceur | ⬜ | - | - | À implémenter |
| Statistiques globales (admin) | ⬜ | - | - | À implémenter |

---

## 🔄 Migration & Refactoring

| Tâche | Statut | Branche | Date | Notes |
|-------|--------|---------|------|-------|
| Migration vers architecture feature-based | ⬜ | - | - | Voir PLAN_RESTRUCTURATION.md |
| Standardisation nommage (anglais) | ⬜ | - | - | nbrChickens → numberOfKitchens, etc. |
| Refactoring système crédits | ⬜ | - | - | CreditWallet, CreditPurchase, CreditExpense |
| Implémentation factories de mocks | ⬜ | - | - | UserFactory, PropertyFactory, etc. |
| Configuration Playwright E2E | ⬜ | - | - | Multi-navigateurs, multi-viewports |
| Tests E2E flows critiques | ⬜ | - | - | Auth, création propriété, achat crédits |

---

## 📝 Notes

- Les features marquées "✅ Existant" nécessitent une refactorisation selon la nouvelle architecture
- Les features marquées "⬜ À implémenter" sont nouvelles et doivent suivre le workflow complet
- Voir `documentation/uml/PLAN_RESTRUCTURATION.md` pour la roadmap de migration

---

*Dernière mise à jour : 2026-03-06*
