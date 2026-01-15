# Options d'Inscription - Register

> **FEATURE-001** - Variantes d'inscription

---

## 📋 Vue d'ensemble

Il existe **2 façons** de créer un compte sur la plateforme :

1. **Inscription Utilisateur Simple** (par défaut)
2. **Inscription Annonceur Directe** (optionnelle)

---

## 1️⃣ Inscription Utilisateur Simple

### Flux
- Création avec rôle **'User'**
- Pas de vérification téléphone obligatoire (optionnelle)
- Pas de CGU Annonceur
- Pas de création `AnnouncerProfile`
- **3 crédits de bienvenue** (mais pas utilisables tant qu'il n'est pas Annonceur)

### Diagramme
Voir : [`register-activity-diagram.puml`](./register-activity-diagram.puml)

### Utilisation
- Utilisateur qui veut juste **rechercher** des propriétés
- Utilisateur qui veut **consulter** des annonces
- Utilisateur qui veut **ajouter aux favoris**

### Migration ultérieure
L'utilisateur peut **devenir Annonceur** plus tard via :
- Use Case : `UC_BecomeAnnouncer` (Utilisateur)
- Voir : Phase 3 du plan de refactoring

---

## 2️⃣ Inscription Annonceur Directe

### Flux
- Création avec rôle **'Announcer'** directement
- **Vérification téléphone obligatoire** (OTP)
- Acceptation **CGU Annonceur** obligatoire
- Choix du **type d'annonceur** (INDIVIDUAL, AGENCY, BROKER, AGENT)
- Création **AnnouncerProfile** immédiate
- **3 crédits de bienvenue** (utilisables immédiatement)

### Diagramme
Voir : [`register-activity-diagram-annonceur.puml`](./register-activity-diagram-annonceur.puml)

### Étapes supplémentaires
1. **Acceptation CGU Annonceur**
   - Conditions spécifiques pour les annonceurs
   - Règles de publication
   - Responsabilités

2. **Vérification téléphone (OTP)**
   - Envoi code OTP par SMS
   - Vérification obligatoire
   - `phoneNumberVerified: true`

3. **Choix type d'annonceur**
   - **INDIVIDUAL** : Propriétaire individuel
   - **AGENCY** : Agence immobilière
   - **BROKER** : Démarcheur
   - **AGENT** : Mandataire

4. **Création AnnouncerProfile**
   - `userId`
   - `announcerType`
   - `acceptedTermsAt`
   - `becameAnnouncerAt`
   - `isVerified: true`

### Utilisation
- Propriétaire qui veut **publier** des annonces immédiatement
- Agence qui veut **gérer** plusieurs propriétés
- Démarcheur qui veut **promouvoir** des biens

---

## 🔄 Comparaison

| Critère | Utilisateur Simple | Annonceur Direct |
|---------|-------------------|-----------------|
| **Rôle** | `User` | `Announcer` |
| **Vérification téléphone** | Optionnelle | **Obligatoire (OTP)** |
| **CGU Annonceur** | Non | **Oui** |
| **Type d'annonceur** | Non | **Oui (choix)** |
| **AnnouncerProfile** | Non | **Oui (créé)** |
| **Crédits utilisables** | Non (pas Annonceur) | **Oui (3 crédits)** |
| **Peut publier** | Non | **Oui (immédiatement)** |
| **Migration nécessaire** | Oui (pour publier) | Non |

---

## 🎯 Recommandation

### Pour l'utilisateur
- **Utilisateur simple** : Si vous voulez juste rechercher/consulter
- **Annonceur direct** : Si vous voulez publier des annonces immédiatement

### Pour le développement
- **Implémenter les 2 flux** :
  1. Flux Utilisateur Simple (par défaut)
  2. Flux Annonceur Direct (optionnel, avec étapes supplémentaires)

- **Bouton de choix** dans le formulaire d'inscription :
  ```
  [ ] Je veux créer un compte Utilisateur
  [ ] Je veux créer un compte Annonceur
  ```

---

## 📝 Notes d'Implémentation

### Service Layer
```typescript
interface SignupData {
  // ... champs communs
  accountType: 'User' | 'Announcer'
  announcerType?: 'INDIVIDUAL' | 'AGENCY' | 'BROKER' | 'AGENT'
  acceptAnnouncerTerms?: boolean
  phoneVerificationCode?: string
}
```

### Logique conditionnelle
```typescript
if (signupData.accountType === 'Announcer') {
  // Vérifier téléphone (OTP)
  // Vérifier CGU Annonceur acceptées
  // Créer avec rôle 'Announcer'
  // Créer AnnouncerProfile
} else {
  // Créer avec rôle 'User'
  // Pas de vérification téléphone obligatoire
  // Pas d'AnnouncerProfile
}
```

---

*Dernière mise à jour : 2026-01-12*

