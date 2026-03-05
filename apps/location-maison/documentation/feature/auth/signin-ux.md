# UX - FEATURE-003 Signin

## 1) Objectif UX

Permettre une connexion rapide, claire et fiable avec:

- un parcours credentials simple
- une option Google lisible
- des messages d’erreur compréhensibles et actionnables
- une cohérence visuelle entre desktop/mobile et signup/signin

---

## 2) Personae ciblés

1. Utilisateur standard qui revient sur la plateforme.
2. Utilisateur Google qui veut se connecter rapidement.
3. Utilisateur qui se trompe de provider (cas fréquent en production).

---

## 3) Parcours utilisateur

## A) Parcours nominal credentials

1. Ouvre `/signin`.
2. Saisit email + mot de passe.
3. Clique "Se connecter".
4. Reçoit toast succès.
5. Est redirigé vers `/property`.

## B) Parcours nominal Google

1. Ouvre `/signin`.
2. Clique "Continuer avec Google".
3. Fait consentement OAuth.
4. Revient connecté sur l’application.

## C) Parcours erreur provider

1. Utilisateur tente Google sur un compte credentials-only.
2. Revient sur `/signin?error=wrong_provider`.
3. Toast de guidance:
   - se connecter avec méthode initiale
   - lier providers ensuite dans "Login & Security".

---

## 4) Principes UX appliqués

1. **Feedback immédiat**: chaque erreur a un titre, message, durée adaptés.
2. **Actionnable**: les erreurs provider indiquent quoi faire.
3. **Cohérence**: même logique error mapping desktop/mobile.
4. **Progressive trust**:
   - messages explicites pour `email non vérifié`
   - formulation non technique pour l’utilisateur final.

---

## 5) Matrice message UX

| Situation | Message attendu |
|---|---|
| Email non vérifié | Vérifier boîte mail et cliquer lien de vérification |
| Mauvais mot de passe | Mot de passe incorrect |
| Compte introuvable | Aucun compte associé |
| Wrong provider | Utiliser méthode initiale puis lier provider |
| Google provider désactivé | Activer provider côté Firebase (environnement) |
| Erreur réseau | Vérifier connexion Internet |

---

## 6) Accessibilité UX

1. Inputs avec labels explicites.
2. Boutons désactivés pendant soumission pour éviter doubles actions.
3. Messages toast non silencieux sur échec.
4. Contraste bouton principal conforme au thème auth existant.

---

## 7) Mobile UX

1. Hiérarchie visuelle condensée:
   - formulaire en premier
   - social login juste après séparateur "OU"
2. Navigation retour claire (chevron vers home).
3. CTA unique principal "Connexion" avec état loading.

---

## 8) Critères UX d’acceptation

1. Aucun message générique incompréhensible côté utilisateur final.
2. Les erreurs provider ne mènent jamais à un écran technique brut.
3. Le flow mobile et desktop donne la même issue métier.
