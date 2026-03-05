# Options d'Inscription - Register

> **FEATURE-001** - Variantes d'inscription

---

## Vue d'ensemble

Il existe 2 facons de creer un compte sur la plateforme:

1. **Inscription Utilisateur** (par defaut)
2. **Inscription Annonceur directe** (optionnelle)

Dans les 2 cas:
- verification email declenchee a l'inscription

---

## 1. Inscription Utilisateur

### Flux
- Creation avec profil utilisateur standard
- Roles attribues: `['User']`
- Pas de conditions annonceur
- Gestion du profil annonceur (`AnnouncerProfile`) hors scope du signup

### Diagramme
Voir: [`register-activity-diagram.puml`](./register-activity-diagram.puml)

### Utilisation
- Consulter des annonces
- Rechercher des biens
- Gerer ses favoris

### Hors scope signup
La gestion detaillee du profil (User/Annonceur) est traitee par la feature dediee au profil.

---

## 2. Inscription Annonceur directe

### Flux
- Creation compte annonceur
- Roles attribues: `['User', 'Announcer']`
- Acceptation des conditions annonceur obligatoire
- Verification email declenchee a l'inscription

### Diagramme
Voir: [`register-activity-diagram-annonceur.puml`](./register-activity-diagram-annonceur.puml)

### Etapes specifiques
1. **Acceptation des conditions annonceur**
   - obligations de publication
   - responsabilites de l'annonceur

2. **Creation compte annonceur**
   - compte auth + document user
   - roles `User + Announcer` appliques au signup

---

## Comparaison

| Critere | Utilisateur | Annonceur direct |
|---------|-------------|------------------|
| Type de compte au signup | `User` | `Announcer` |
| Conditions annonceur | Non | Oui |
| Verification email | Oui | Oui |
| Peut publier immediatement | Non | Oui |

---

## Notes d'implementation

### Service Layer
```typescript
interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber: string
  country: string
  acceptTerms: boolean
  accountType?: 'User' | 'Announcer'
  announcerType?: 'INDIVIDUAL' | 'AGENCY' | 'BROKER' | 'AGENT'
  acceptAnnouncerTerms?: boolean
}
```

### Logique conditionnelle
```typescript
if (signupData.accountType === 'Announcer') {
  // Verifier les conditions annonceur
  // Creer avec roles ['User', 'Announcer']
} else {
  // Creer avec role ['User']
}
```

---

*Derniere mise a jour : 2026-03-05*
