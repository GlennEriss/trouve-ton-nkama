# Plan de Tests Manuels - Inscription (Desktop)

**Environnement :** Préprod  
**Taille d'écran :** Desktop (> 1024px)  
**Date :** À compléter  
**Testeur :** À compléter

---

## 💻 Configuration de Test

- **Viewport :** 1920px × 1080px ou équivalent
- **Navigateur :** Chrome / Firefox / Safari / Edge
- **URL de test :** `https://[preprod-url]/signup`

**Note :** Sur desktop, le formulaire utilise un format multi-étapes avec indicateurs de progression.

---

## ✅ Checklist de Tests

### 1. Affichage du Formulaire d'Inscription

**Objectif :** Vérifier que le formulaire desktop s'affiche correctement

**Étapes :**
1. Accéder à la page `/signup` sur desktop
2. Observer l'affichage du formulaire

**Résultat attendu :**
- ✅ Le formulaire multi-étapes s'affiche
- ✅ Les indicateurs d'étapes sont visibles (ex: "Étape 1 sur 4")
- ✅ L'étape 1 "Qui êtes-vous ?" est affichée
- ✅ Les champs Nom et Prénom sont visibles avec placeholders "Entrez votre nom" et "Entrez votre prénom"
- ✅ Le bouton "Continuer" est visible
- ✅ Le design est élégant et moderne
- ✅ Les animations sont présentes et fluides

**Bugs éventuels à noter :**
- [ ] Formulaire non affiché
- [ ] Indicateurs d'étapes manquants
- [ ] Design cassé ou incohérent
- [ ] Animations manquantes ou saccadées

---

### 2. Navigation Multi-Étapes

**Objectif :** Vérifier la navigation entre les étapes

**Étapes :**
1. Observer les indicateurs d'étapes en haut du formulaire
2. Compléter l'étape 1 et cliquer sur "Continuer"
3. Observer la transition vers l'étape 2
4. Vérifier que l'étape 1 est marquée comme complétée
5. Tester le bouton "Retour" (si présent) pour revenir à l'étape précédente

**Résultat attendu :**
- ✅ Les indicateurs d'étapes montrent clairement la progression
- ✅ La transition entre étapes est fluide avec animation
- ✅ Les étapes complétées sont visuellement marquées
- ✅ Le bouton "Retour" permet de revenir en arrière
- ✅ Les données des étapes précédentes sont conservées

**Bugs éventuels à noter :**
- [ ] Navigation bloquée entre étapes
- [ ] Transitions saccadées
- [ ] Données perdues lors de la navigation
- [ ] Bouton retour non fonctionnel

---

### 3. Étape 1 - Identité (Qui êtes-vous ?)

**Objectif :** Vérifier la complétion de l'étape Identité

**Étapes :**
1. Vérifier que le titre "Qui êtes-vous ?" est affiché
2. Remplir le champ "Nom" avec "Doe"
3. Remplir le champ "Prénom" avec "John"
4. Observer la validation en temps réel
5. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les champs sont visibles et accessibles
- ✅ La validation affiche des erreurs si les champs sont vides
- ✅ Le bouton "Continuer" s'active quand les champs sont remplis
- ✅ Transition fluide vers l'étape 2
- ✅ Les données sont conservées

**Bugs éventuels à noter :**
- [ ] Champs non accessibles
- [ ] Validation non fonctionnelle
- [ ] Bouton continuer bloqué même avec champs remplis
- [ ] Données perdues lors de la transition

---

### 4. Étape 2 - Contact (Comment vous joindre ?)

**Objectif :** Vérifier la complétion de l'étape Contact

**Étapes :**
1. Vérifier que le titre "Comment vous joindre ?" est affiché
2. Remplir l'email avec "test@example.com"
3. Observer la validation de l'email
4. Remplir le téléphone avec un numéro valide (ex: +241061234567)
5. Observer la validation du téléphone (formats 8 et 9 chiffres)
6. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les champs email et téléphone sont visibles
- ✅ La validation de l'email fonctionne (format vérifié)
- ✅ La validation du téléphone fonctionne (formats gabonais acceptés)
- ✅ Le code pays (+241) est ajouté automatiquement
- ✅ Le bouton "Continuer" s'active quand les champs sont valides
- ✅ Transition fluide vers l'étape 3

**Bugs éventuels à noter :**
- [ ] Validation email incorrecte
- [ ] Validation téléphone incorrecte
- [ ] Code pays manquant
- [ ] Bouton continuer bloqué

---

### 5. Étape 3 - Date de Naissance

**Objectif :** Vérifier la sélection de la date de naissance

**Étapes :**
1. Vérifier que l'étape 3 s'affiche
2. Observer les 3 sélecteurs (Jour, Mois, Année)
3. Cliquer sur le sélecteur "Jour" et choisir "01"
4. Cliquer sur le sélecteur "Mois" et choisir "Janvier"
5. Cliquer sur le sélecteur "Année" et choisir "2000"
6. Vérifier que la date est bien sélectionnée
7. Cliquer sur "Continuer"

**Résultat attendu :**
- ✅ Les 3 sélecteurs sont visibles et fonctionnels
- ✅ Les listes déroulantes s'ouvrent correctement
- ✅ La sélection est enregistrée et visible
- ✅ Le bouton "Continuer" s'active après sélection
- ✅ Transition fluide vers l'étape 4
- ✅ Les sélecteurs sont faciles à utiliser

**Bugs éventuels à noter :**
- [ ] Sélecteurs non fonctionnels
- [ ] Sélection non enregistrée
- [ ] Listes déroulantes difficiles à utiliser
- [ ] Interface confuse

---

### 6. Étape 4 - Sécurité (Sécurisez votre compte)

**Objectif :** Vérifier la complétion de l'étape Sécurité

**Étapes :**
1. Vérifier que le titre "Sécurisez votre compte" est affiché
2. Remplir le mot de passe avec "Password123!"
3. Observer la validation de la force du mot de passe
4. Remplir la confirmation avec "Password123!"
5. Observer la validation de la correspondance
6. Cocher la case d'acceptation des conditions
7. Observer que le bouton "Créer mon compte" s'active

**Résultat attendu :**
- ✅ Les champs mot de passe sont visibles avec placeholders "Créez un mot de passe" et "Confirmez votre mot de passe"
- ✅ La validation de la force du mot de passe fonctionne (8 caractères, majuscule, chiffre)
- ✅ La validation de la correspondance fonctionne
- ✅ La case à cocher est accessible et fonctionnelle
- ✅ Le bouton "Créer mon compte" s'active quand tout est valide
- ✅ Les liens vers les conditions sont cliquables

**Bugs éventuels à noter :**
- [ ] Validation mot de passe incorrecte
- [ ] Validation correspondance non fonctionnelle
- [ ] Case à cocher non fonctionnelle
- [ ] Bouton de soumission bloqué
- [ ] Liens vers conditions non fonctionnels

---

### 7. Validation des Champs - Messages d'Erreur

**Objectif :** Vérifier l'affichage et la qualité des messages d'erreur

**Étapes :**
1. Tester chaque champ avec des valeurs invalides :
   - Email : "email-invalide", "test@", "test@example.com"
   - Téléphone : "123", numéro valide
   - Mot de passe : "123", "password", "Password123!"
   - Confirmation : "Different123!", "Password123!"
2. Observer les messages d'erreur pour chaque cas

**Résultat attendu :**
- ✅ Les messages d'erreur sont clairs et compréhensibles
- ✅ Les messages apparaissent au bon moment (validation en temps réel)
- ✅ Les messages disparaissent quand les erreurs sont corrigées
- ✅ Les messages sont visibles et bien positionnés
- ✅ Les messages sont en français

**Bugs éventuels à noter :**
- [ ] Messages d'erreur confus ou en anglais
- [ ] Messages non affichés
- [ ] Messages qui ne disparaissent pas
- [ ] Messages mal positionnés

---

### 8. Erreur - Email Déjà Utilisé

**Objectif :** Vérifier l'affichage du toast d'erreur quand l'email existe déjà

**Étapes :**
1. Compléter toutes les étapes du formulaire
2. Utiliser un email déjà utilisé (ex: `hetiwoh254@feanzier.com`)
3. Remplir tous les autres champs correctement
4. Soumettre le formulaire
5. Observer le message d'erreur

**Résultat attendu :**
- ✅ Un toast d'erreur apparaît immédiatement après soumission
- ✅ Le titre est "Email déjà utilisé" (pas "Error" ou "Erreur")
- ✅ La description est claire et informative : "Cette adresse email est déjà associée à un compte existant. Si c'est votre compte, veuillez vous connecter. Sinon, utilisez une autre adresse email."
- ✅ Le toast a un style destructif (rouge/erreur)
- ✅ Le toast reste visible pendant quelques secondes (5 secondes)
- ✅ L'utilisateur reste sur la page d'inscription (pas de redirection)
- ✅ Les données du formulaire sont conservées (sauf le mot de passe)

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Titre générique "Error" ou "Erreur"
- [ ] Description non informative
- [ ] Message en anglais
- [ ] Redirection vers une page d'erreur
- [ ] Données du formulaire perdues

---

### 9. Erreur - Numéro de Téléphone Déjà Utilisé

**Objectif :** Vérifier l'affichage du toast d'erreur quand le numéro existe déjà

**Étapes :**
1. Compléter toutes les étapes avec un numéro de téléphone déjà utilisé
2. Utiliser un email nouveau
3. Soumettre le formulaire
4. Observer le message d'erreur

**Résultat attendu :**
- ✅ Toast d'erreur avec titre "Numéro de téléphone déjà utilisé"
- ✅ Description claire indiquant que le numéro est déjà associé à un compte
- ✅ Style destructif
- ✅ L'utilisateur reste sur la page

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Message confus
- [ ] Erreur non gérée

---

### 10. Erreur - Mot de Passe Faible

**Objectif :** Vérifier l'affichage du toast d'erreur pour mot de passe faible

**Étapes :**
1. Compléter toutes les étapes
2. Utiliser un mot de passe faible (ex: "123456")
3. Soumettre le formulaire
4. Observer le message d'erreur

**Résultat attendu :**
- ✅ Toast d'erreur avec titre "Mot de passe trop faible"
- ✅ Description claire : "Votre mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre."
- ✅ Style destructif
- ✅ L'utilisateur reste sur la page

**Bugs éventuels à noter :**
- [ ] Toast non affiché
- [ ] Message confus
- [ ] Critères non clairs

---

### 11. Inscription Complète Réussie

**Objectif :** Vérifier le processus complet d'inscription avec succès

**Étapes :**
1. S'assurer que l'email `hetiwoh254@feanzier.com` n'existe pas (supprimer si nécessaire via script)
2. Compléter toutes les étapes :
   - **Étape 1 :** Nom "Test", Prénom "User"
   - **Étape 2 :** Email `hetiwoh254@feanzier.com`, Téléphone unique (ex: +24106XXXXXXXX)
   - **Étape 3 :** Date de naissance 01/01/2000
   - **Étape 4 :** Mot de passe "Password123!", Confirmation "Password123!", Accepter conditions
3. Soumettre le formulaire
4. Observer le comportement

**Résultat attendu :**
- ✅ Un toast de succès apparaît : "🎉 Bienvenue !" / "Votre compte a été créé avec succès!"
- ✅ Redirection vers `/signup/success?uid=[UID]` (UID visible dans l'URL)
- ✅ La page de succès affiche :
  - Un message de bienvenue
  - L'information que l'email de vérification a été envoyé
  - Un bouton pour renvoyer l'email si nécessaire
  - Des instructions claires
- ✅ L'email de vérification est bien envoyé (vérifier dans la boîte mail `hetiwoh254@feanzier.com`)
- ✅ Le compte est créé dans Firebase Auth avec l'email fourni
- ✅ Le compte est créé dans Firestore avec toutes les données
- ✅ Le statut du compte est "IN_PROGRESS"

**Bugs éventuels à noter :**
- [ ] Toast de succès non affiché
- [ ] Pas de redirection
- [ ] Page de succès non accessible ou incomplète
- [ ] Email de vérification non envoyé
- [ ] Compte non créé dans Firebase Auth
- [ ] Compte non créé dans Firestore
- [ ] Données manquantes dans Firestore

---

### 12. Navigation au Clavier

**Objectif :** Vérifier que la navigation au clavier fonctionne bien

**Étapes :**
1. Utiliser uniquement le clavier pour naviguer dans le formulaire
2. Tester Tab pour passer d'un champ à l'autre
3. Tester Enter pour soumettre
4. Tester Escape pour fermer les modales (si présentes)

**Résultat attendu :**
- ✅ La navigation Tab fonctionne entre tous les champs
- ✅ L'ordre de tabulation est logique
- ✅ Enter soumet le formulaire ou passe à l'étape suivante
- ✅ Les focus sont visibles et clairs
- ✅ La navigation est fluide

**Bugs éventuels à noter :**
- [ ] Tab ne fonctionne pas
- [ ] Ordre de tabulation illogique
- [ ] Focus non visible
- [ ] Enter ne fonctionne pas

---

### 13. Responsivité et Adaptation

**Objectif :** Vérifier que le formulaire s'adapte à différentes largeurs d'écran

**Étapes :**
1. Tester avec différentes largeurs d'écran :
   - 1920px (large)
   - 1366px (moyen)
   - 1024px (petit desktop)
2. Redimensionner la fenêtre du navigateur
3. Observer l'adaptation du formulaire

**Résultat attendu :**
- ✅ Le formulaire s'adapte bien à toutes les largeurs
- ✅ Les éléments ne sont pas coupés
- ✅ Les espacements restent appropriés
- ✅ Le texte reste lisible
- ✅ Les boutons restent accessibles

**Bugs éventuels à noter :**
- [ ] Éléments coupés à certaines largeurs
- [ ] Espacements incorrects
- [ ] Texte illisible
- [ ] Boutons inaccessibles

---

### 14. Performance et Fluidité

**Objectif :** Vérifier les performances et la fluidité de l'interface

**Étapes :**
1. Parcourir tout le formulaire rapidement
2. Observer les temps de chargement
3. Tester les animations et transitions
4. Vérifier qu'il n'y a pas de freeze ou de lag

**Résultat attendu :**
- ✅ Les transitions entre étapes sont fluides (< 300ms)
- ✅ Les animations sont fluides (60fps)
- ✅ Pas de freeze ou de lag
- ✅ Temps de chargement acceptable (< 2s)
- ✅ L'interface répond rapidement aux interactions

**Bugs éventuels à noter :**
- [ ] Transitions lentes ou saccadées
- [ ] Animations qui lag
- [ ] Freeze de l'interface
- [ ] Temps de chargement trop long

---

### 15. Accessibilité

**Objectif :** Vérifier l'accessibilité du formulaire

**Étapes :**
1. Tester avec un lecteur d'écran (si disponible)
2. Vérifier les labels des champs
3. Vérifier les contrastes de couleurs
4. Vérifier la taille des éléments cliquables

**Résultat attendu :**
- ✅ Les champs ont des labels appropriés
- ✅ Les contrastes sont suffisants (WCAG AA minimum)
- ✅ Les éléments cliquables sont assez grands (min 44×44px)
- ✅ La navigation au clavier fonctionne
- ✅ Les messages d'erreur sont accessibles

**Bugs éventuels à noter :**
- [ ] Labels manquants
- [ ] Contrastes insuffisants
- [ ] Éléments trop petits
- [ ] Navigation clavier non fonctionnelle

---

## 📝 Notes de Test

**Date :** _______________  
**Testeur :** _______________  
**Environnement :** Préprod  
**Version :** _______________

### Résumé des Tests

- ✅ Tests réussis : _____ / 15
- ❌ Tests échoués : _____ / 15
- ⚠️ Tests partiels : _____ / 15

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

- [ ] Test 8 : Erreur email déjà utilisé
- [ ] Test 11 : Inscription complète réussie
- [ ] Test 12 : Navigation au clavier
- [ ] Test 14 : Performance et fluidité

---

## 📋 Checklist de Vérification Post-Test

Avant de considérer les tests comme terminés, vérifier :

- [ ] Tous les tests ont été exécutés
- [ ] Tous les bugs ont été documentés
- [ ] Les captures d'écran ont été prises pour les bugs
- [ ] Les logs de la console ont été vérifiés
- [ ] Les requêtes réseau ont été vérifiées (email de vérification)
- [ ] Firebase Auth et Firestore ont été vérifiés pour les créations de compte
