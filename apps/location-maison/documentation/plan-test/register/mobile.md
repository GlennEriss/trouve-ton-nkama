# Plan de Tests Manuels - Inscription (Mobile)

**Environnement :** Préprod  
**Taille d'écran :** Mobile (≤ 768px)  
**Date :** À compléter  
**Testeur :** À compléter

---

## 📱 Configuration de Test

- **Viewport :** 375px × 667px (iPhone SE) ou équivalent
- **Navigateur :** Chrome Mobile / Safari Mobile
- **URL de test :** `https://[preprod-url]/signup`

---

## ✅ Checklist de Tests

### 1. Affichage du Formulaire d'Inscription

**Objectif :** Vérifier que le formulaire mobile s'affiche correctement

**Étapes :**
1. Accéder à la page `/signup` sur mobile
2. Observer l'affichage du formulaire

**Résultat attendu :**
- ✅ Le formulaire mobile s'affiche (formulaire unique, pas de multi-étapes)
- ✅ Le titre "Explorons ensemble" ou "Créer un compte" est visible
- ✅ Tous les champs sont visibles sur une seule page :
  - Nom (placeholder: "Saisissez votre nom")
  - Prénom (placeholder: "Saisissez votre prénom")
  - Email (placeholder: "Saisissez votre email")
  - Date de naissance (3 sélecteurs : jour, mois, année)
  - Téléphone
  - Mot de passe (placeholder: "Saisissez votre mot de passe")
  - Confirmation mot de passe
  - Case à cocher pour accepter les conditions
- ✅ Le bouton "S'inscrire" ou "Créer mon compte" est visible
- ✅ Le formulaire est responsive et s'adapte à la largeur de l'écran

**Bugs éventuels à noter :**
- [ ] Formulaire coupé ou non visible
- [ ] Champs superposés
- [ ] Texte illisible
- [ ] Boutons non cliquables

---

### 2. Validation des Champs - Nom et Prénom

**Objectif :** Vérifier la validation en temps réel des champs nom et prénom

**Étapes :**
1. Cliquer sur le champ "Nom"
2. Laisser le champ vide et cliquer ailleurs (blur)
3. Remplir le champ "Nom" avec "Doe"
4. Cliquer sur le champ "Prénom"
5. Laisser le champ vide et cliquer ailleurs
6. Remplir le champ "Prénom" avec "John"

**Résultat attendu :**
- ✅ Les messages d'erreur apparaissent si les champs sont vides
- ✅ Les messages d'erreur disparaissent quand les champs sont remplis
- ✅ La validation est fluide et non bloquante

**Bugs éventuels à noter :**
- [ ] Messages d'erreur non affichés
- [ ] Messages d'erreur qui ne disparaissent pas
- [ ] Validation trop agressive

---

### 3. Validation de l'Email

**Objectif :** Vérifier la validation du format email

**Étapes :**
1. Cliquer sur le champ "Email"
2. Saisir "email-invalide" (sans @)
3. Cliquer ailleurs (blur)
4. Saisir "test@" (email incomplet)
5. Saisir "test@example.com" (email valide)

**Résultat attendu :**
- ✅ Message d'erreur affiché pour "email-invalide"
- ✅ Message d'erreur affiché pour "test@"
- ✅ Aucune erreur pour "test@example.com"
- ✅ Le message d'erreur est clair et compréhensible

**Bugs éventuels à noter :**
- [ ] Email invalide accepté
- [ ] Email valide rejeté
- [ ] Message d'erreur confus

---

### 4. Validation du Numéro de Téléphone

**Objectif :** Vérifier la validation du numéro de téléphone gabonais

**Étapes :**
1. Cliquer sur le champ "Téléphone"
2. Saisir "01234567" (ancien format 8 chiffres)
3. Observer la validation
4. Saisir "061234567" (nouveau format 9 chiffres)
5. Observer la validation
6. Saisir un numéro invalide (ex: "123")

**Résultat attendu :**
- ✅ Les deux formats (8 et 9 chiffres) sont acceptés
- ✅ Message d'erreur clair pour numéro invalide
- ✅ Le code pays (+241) est ajouté automatiquement
- ✅ Le formatage est fluide pendant la saisie

**Bugs éventuels à noter :**
- [ ] Format valide rejeté
- [ ] Format invalide accepté
- [ ] Code pays manquant ou incorrect
- [ ] Saisie bloquée ou saccadée

---

### 5. Sélection de la Date de Naissance

**Objectif :** Vérifier la sélection de la date de naissance

**Étapes :**
1. Cliquer sur le sélecteur "Jour"
2. Choisir "01"
3. Cliquer sur le sélecteur "Mois"
4. Choisir "Janvier"
5. Cliquer sur le sélecteur "Année"
6. Choisir "2000"
7. Vérifier que la date est bien sélectionnée

**Résultat attendu :**
- ✅ Les 3 sélecteurs s'ouvrent correctement
- ✅ Les options sont lisibles et sélectionnables
- ✅ La date sélectionnée est visible après sélection
- ✅ La navigation dans les listes est fluide

**Bugs éventuels à noter :**
- [ ] Sélecteurs qui ne s'ouvrent pas
- [ ] Options non sélectionnables
- [ ] Date non enregistrée
- [ ] Interface difficile à utiliser sur mobile

---

### 6. Validation du Mot de Passe

**Objectif :** Vérifier la validation de la force du mot de passe

**Étapes :**
1. Cliquer sur le champ "Mot de passe"
2. Saisir "123" (trop court)
3. Observer le message d'erreur
4. Saisir "password" (pas de majuscule ni chiffre)
5. Observer le message d'erreur
6. Saisir "Password123!" (valide)

**Résultat attendu :**
- ✅ Message d'erreur pour mot de passe trop court
- ✅ Message d'erreur pour mot de passe faible
- ✅ Aucune erreur pour mot de passe valide
- ✅ Les critères de validation sont clairs (8 caractères, majuscule, chiffre)

**Bugs éventuels à noter :**
- [ ] Mot de passe faible accepté
- [ ] Mot de passe valide rejeté
- [ ] Critères de validation non clairs

---

### 7. Validation de la Confirmation du Mot de Passe

**Objectif :** Vérifier que les deux mots de passe correspondent

**Étapes :**
1. Saisir "Password123!" dans "Mot de passe"
2. Saisir "Different123!" dans "Confirmation"
3. Cliquer ailleurs (blur)
4. Corriger la confirmation avec "Password123!"

**Résultat attendu :**
- ✅ Message d'erreur affiché si les mots de passe ne correspondent pas
- ✅ L'erreur disparaît quand les mots de passe correspondent
- ✅ Le message d'erreur est clair

**Bugs éventuels à noter :**
- [ ] Mots de passe différents acceptés
- [ ] Mots de passe identiques rejetés
- [ ] Message d'erreur confus

---

### 8. Acceptation des Conditions

**Objectif :** Vérifier que l'acceptation des conditions est obligatoire

**Étapes :**
1. Remplir tous les champs du formulaire
2. Ne pas cocher la case "J'accepte les conditions"
3. Essayer de soumettre le formulaire
4. Cocher la case
5. Essayer de soumettre à nouveau

**Résultat attendu :**
- ✅ Le bouton "S'inscrire" est désactivé si la case n'est pas cochée
- ✅ Message d'erreur si tentative de soumission sans accepter
- ✅ Le bouton devient actif une fois la case cochée
- ✅ Les liens vers les conditions sont cliquables

**Bugs éventuels à noter :**
- [ ] Formulaire soumis sans accepter les conditions
- [ ] Case non cliquable
- [ ] Liens vers conditions non fonctionnels

---

### 9. Erreur - Email Déjà Utilisé

**Objectif :** Vérifier l'affichage du toast d'erreur quand l'email existe déjà

**Étapes :**
1. Remplir le formulaire avec un email déjà utilisé (ex: `hetiwoh254@feanzier.com`)
2. Remplir tous les autres champs correctement
3. Cocher les conditions
4. Cliquer sur "S'inscrire"
5. Observer le message d'erreur

**Résultat attendu :**
- ✅ Un toast d'erreur apparaît
- ✅ Le titre est "Email déjà utilisé" (pas "Error" ou "Erreur")
- ✅ La description est claire : "Cette adresse email est déjà utilisée par un autre compte."
- ✅ Le toast a un style destructif (rouge/erreur)
- ✅ Le toast reste visible quelques secondes
- ✅ L'utilisateur reste sur la page d'inscription (pas de redirection)

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Titre générique "Error"
- [ ] Message confus ou en anglais
- [ ] Redirection vers une page d'erreur
- [ ] Toast qui disparaît trop vite

---

### 10. Erreur - Numéro de Téléphone Déjà Utilisé

**Objectif :** Vérifier l'affichage du toast d'erreur quand le numéro existe déjà

**Étapes :**
1. Remplir le formulaire avec un numéro de téléphone déjà utilisé
2. Utiliser un email nouveau
3. Remplir tous les autres champs correctement
4. Soumettre le formulaire
5. Observer le message d'erreur

**Résultat attendu :**
- ✅ Toast d'erreur avec titre "Numéro déjà utilisé"
- ✅ Message clair indiquant que le numéro est déjà associé à un compte
- ✅ Le toast a un style destructif
- ✅ L'utilisateur reste sur la page

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Message confus
- [ ] Erreur non gérée

---

### 11. Inscription Complète Réussie

**Objectif :** Vérifier le processus complet d'inscription avec succès

**Étapes :**
1. S'assurer que l'email `hetiwoh254@feanzier.com` n'existe pas (supprimer si nécessaire)
2. Remplir tous les champs du formulaire :
   - Nom : "Test"
   - Prénom : "User"
   - Email : `hetiwoh254@feanzier.com`
   - Téléphone : Un numéro unique (ex: +24106XXXXXXXX)
   - Date de naissance : 01/01/2000
   - Mot de passe : "Password123!"
   - Confirmation : "Password123!"
3. Cocher les conditions d'utilisation
4. Cliquer sur "S'inscrire"
5. Observer le comportement

**Résultat attendu :**
- ✅ Un toast de succès apparaît : "Création de compte" / "Votre compte a été créé avec succès!"
- ✅ Redirection vers `/signup/success?uid=[UID]`
- ✅ La page de succès affiche :
  - Un message de bienvenue
  - L'information que l'email de vérification a été envoyé
  - Un bouton pour renvoyer l'email si nécessaire
- ✅ L'email de vérification est bien envoyé (vérifier dans la boîte mail)
- ✅ Le compte est créé dans Firebase Auth et Firestore

**Bugs éventuels à noter :**
- [ ] Toast de succès non affiché
- [ ] Pas de redirection
- [ ] Page de succès non accessible
- [ ] Email de vérification non envoyé
- [ ] Compte non créé dans Firebase

---

### 12. Navigation et UX Globale

**Objectif :** Vérifier la fluidité et l'expérience utilisateur globale

**Étapes :**
1. Parcourir le formulaire en remplissant les champs
2. Tester la navigation au clavier (si applicable)
3. Tester le scroll sur mobile
4. Vérifier les animations et transitions
5. Tester avec différentes tailles d'écran mobile

**Résultat attendu :**
- ✅ Navigation fluide entre les champs
- ✅ Le clavier mobile s'affiche correctement
- ✅ Le scroll fonctionne bien
- ✅ Les animations sont fluides (pas de saccades)
- ✅ Le formulaire s'adapte à différentes tailles d'écran
- ✅ Les erreurs sont claires et non bloquantes
- ✅ Le temps de chargement est acceptable

**Bugs éventuels à noter :**
- [ ] Formulaire lent ou qui freeze
- [ ] Clavier qui masque les champs
- [ ] Scroll bloqué
- [ ] Animations saccadées
- [ ] Problèmes de performance

---

## 📝 Notes de Test

**Date :** _______________  
**Testeur :** _______________  
**Environnement :** Préprod  
**Version :** _______________

### Résumé des Tests

- ✅ Tests réussis : _____ / 12
- ❌ Tests échoués : _____ / 12
- ⚠️ Tests partiels : _____ / 12

### Bugs Critiques Identifiés

1. 
2. 
3. 

### Bugs Mineurs Identifiés

1. 
2. 
3. 

### Améliorations Suggérées

1. 
2. 
3. 

### Commentaires Généraux

---

## 🔄 Tests de Régression

Après correction des bugs, réexécuter les tests suivants :

- [ ] Test 9 : Erreur email déjà utilisé
- [ ] Test 11 : Inscription complète réussie
- [ ] Test 12 : Navigation et UX globale
