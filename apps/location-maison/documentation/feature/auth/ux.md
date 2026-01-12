# UX — Inscription (Register)

> **FEATURE-001** - Spécifications UX

---

## 📋 Parcours Utilisateur

### Parcours Principal : Inscription Utilisateur Simple

1. **Visiteur arrive sur la page `/signup`**
   - Voit le formulaire d'inscription
   - Option : "Créer un compte Utilisateur" (par défaut) ou "Créer un compte Annonceur"

2. **Visiteur remplit le formulaire**
   - Prénom (obligatoire)
   - Nom (obligatoire)
   - Email (obligatoire, validation en temps réel)
   - Date de naissance (obligatoire, minimum 18 ans)
   - Numéro de téléphone (obligatoire, validation format)
   - Pays (pré-rempli : Gabon)
   - Mot de passe (obligatoire, minimum 8 caractères, majuscule, chiffre)
   - Confirmation mot de passe (doit correspondre)
   - Checkbox "J'accepte les conditions d'utilisation et la politique de confidentialité" (obligatoire)

3. **Validation en temps réel**
   - Chaque champ est validé au blur (quand l'utilisateur quitte le champ)
   - Messages d'erreur affichés sous chaque champ invalide
   - Bouton "S'inscrire" activé uniquement si tous les champs sont valides

4. **Soumission du formulaire**
   - Bouton "S'inscrire" devient "Création en cours..." avec spinner
   - Formulaire désactivé pendant le traitement
   - Vérifications backend :
     - Unicité email
     - Unicité numéro de téléphone
     - Création compte Firebase Auth
     - Création utilisateur Firestore

5. **En cas de succès**
   - Toast de succès : "Votre compte a été créé avec succès!"
   - Redirection vers `/signup/success?uid=xxx`
   - Page de succès affiche :
     - Message de confirmation
     - Information : "Un email de vérification a été envoyé à votre adresse"
     - Lien pour renvoyer l'email si nécessaire
     - Lien vers la page de connexion

6. **En cas d'erreur**
   - Toast d'erreur avec message spécifique :
     - "Cette adresse email est déjà utilisée"
     - "Ce numéro de téléphone est déjà utilisé"
     - "Le mot de passe est trop faible"
     - "L'adresse email n'est pas valide"
     - etc.
   - Formulaire réactivé
   - Champ concerné mis en évidence (bordure rouge)
   - Message d'erreur affiché sous le champ

### Parcours Alternatif : Inscription Annonceur Directe

1. **Visiteur choisit "Créer un compte Annonceur"**
   - Affichage des conditions spécifiques Annonceur (CGU Annonceur)
   - Checkbox supplémentaire : "J'accepte les conditions d'annonceur"

2. **Vérification téléphone (OTP)**
   - Envoi automatique d'un code OTP par SMS
   - Champ "Code de vérification" apparaît
   - Visiteur saisit le code reçu
   - Validation du code (3 tentatives maximum)

3. **Choix du type d'annonceur**
   - Radio buttons ou Select :
     - Propriétaire (INDIVIDUAL)
     - Agence immobilière (AGENCY)
     - Démarcheur (BROKER)
     - Mandataire (AGENT)

4. **Soumission**
   - Même processus que l'inscription utilisateur
   - Création avec rôle 'Announcer'
   - Création AnnouncerProfile
   - Redirection vers `/signup/success?uid=xxx&type=announcer`

---

## 🎨 États de l'Interface

### État Initial
- Formulaire vide
- Tous les champs activés
- Bouton "S'inscrire" **désactivé** (grisé)
- Aucun message d'erreur visible
- Checkbox conditions **non cochée**

### État Saisie (Validation en temps réel)
- Chaque champ validé au blur
- Messages d'erreur affichés sous les champs invalides
- Bordure rouge sur les champs invalides
- Bordure verte sur les champs valides (optionnel)
- Bouton "S'inscrire" **activé** uniquement si :
  - Tous les champs sont remplis
  - Tous les champs sont valides
  - Checkbox conditions cochée

### État Loading
- Bouton "S'inscrire" → "Création en cours..." avec spinner
- Bouton désactivé
- Tous les champs désactivés (readonly)
- Overlay de chargement (optionnel, pour éviter double soumission)

### État Succès
- Toast de succès affiché (5 secondes)
- Redirection automatique vers `/signup/success` après 2 secondes
- Animation de transition (fade out)

### État Erreur
- Toast d'erreur affiché (5 secondes)
- Champ concerné mis en évidence (bordure rouge + background léger)
- Message d'erreur sous le champ concerné
- Formulaire réactivé
- Bouton "S'inscrire" réactivé

---

## 🖱️ Interactions

### Navigation Clavier
- **Tab** : Navigation entre les champs (ordre logique)
- **Enter** : Soumission du formulaire si valide
- **Escape** : Fermer les messages d'erreur/toast (si applicable)

### Focus
- Focus automatique sur le premier champ (Prénom) au chargement
- Focus sur le champ en erreur après soumission échouée

### Validation
- **Validation en temps réel** : Au blur (quand l'utilisateur quitte le champ)
- **Validation au submit** : Vérification complète avant envoi
- **Messages d'erreur** : Affichés sous chaque champ avec icône d'erreur

### Feedback Visuel
- **Champ valide** : Bordure verte (optionnel) ou bordure par défaut
- **Champ invalide** : Bordure rouge + icône d'erreur
- **Champ en focus** : Bordure bleue (focus ring)
- **Bouton hover** : Légère élévation (shadow)

---

## ♿ Accessibilité

### Labels et Descriptions
- Tous les champs ont des labels explicites (`<label>`)
- Labels associés aux inputs via `htmlFor` / `id`
- Messages d'erreur associés aux champs via `aria-describedby`
- Messages d'erreur avec `role="alert"` pour les screen readers

### Contraste
- Contrast ratio minimum **4.5:1** pour le texte
- Contrast ratio minimum **3:1** pour les éléments interactifs
- Couleurs d'erreur accessibles (pas uniquement rouge, utiliser aussi icônes)

### Navigation Clavier
- Tous les éléments interactifs accessibles au clavier
- Ordre de tabulation logique
- Focus visible (outline)

### Screen Readers
- Messages d'erreur annoncés automatiquement
- Toast de succès/erreur annoncés
- États de chargement annoncés ("Création en cours...")

---

## 📱 Responsive

### Mobile (< 640px)
- Formulaire en pleine largeur
- Padding réduit (16px au lieu de 32px)
- Champs empilés verticalement
- Bouton pleine largeur
- Date de naissance : 3 champs empilés (jour, mois, année)

### Tablette (640px - 1024px)
- Formulaire centré avec max-width 500px
- Padding 24px
- Layout similaire desktop

### Desktop (> 1024px)
- Formulaire centré avec max-width 500px
- Padding 32px
- Date de naissance : 3 champs côte à côte (flex)

---

## 🔄 Transitions et Animations

### Chargement
- Fade-in du formulaire au chargement (300ms, ease-out)
- Spinner dans le bouton pendant le chargement

### Erreurs
- Shake animation sur le champ en erreur (200ms)
- Fade-in du message d'erreur (200ms)

### Succès
- Toast slide-in depuis le haut (300ms)
- Fade-out avant redirection (500ms)

### Hover
- Bouton : Légère élévation (scale: 1.02, shadow)
- Liens : Soulignement au hover

---

## 🎯 Points d'Attention UX

1. **Clarté des messages d'erreur**
   - Messages spécifiques et actionnables
   - Pas de messages techniques (ex: "auth/email-already-in-use")
   - Suggestions de correction si possible

2. **Feedback immédiat**
   - Validation en temps réel (pas seulement au submit)
   - Indication visuelle claire de l'état de chaque champ

3. **Réduction de la friction**
   - Pré-remplir le pays (Gabon)
   - Validation progressive (pas tout en une fois)
   - Messages d'aide contextuels (ex: format téléphone attendu)

4. **Gestion des erreurs réseau**
   - Message clair en cas de problème réseau
   - Possibilité de réessayer sans re-remplir le formulaire
   - Sauvegarde locale des données (optionnel, localStorage)

---

*Dernière mise à jour : 2026-01-12*

