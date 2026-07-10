# UI - FEATURE-003 Signin

## 1) Objectif UI

Aligner visuellement la page `/signin` avec le langage visuel moderne de `/signup`:

- panneau branding riche en desktop
- carte formulaire claire côté action
- version mobile compacte et cohérente

---

## 2) Composition desktop

Composant: `src/features/auth/ui/v1/SigninFormModern.tsx`

Structure:

1. **Left panel (desktop only)**:
   - gradient de marque
   - logo + headline
   - liste de bénéfices
2. **Right panel**:
   - titre "Connexion"
   - formulaire email/password
   - lien mot de passe oublié
   - bouton principal signin
   - séparateur "ou continuer avec"
   - bouton Google
   - lien vers signup

---

## 3) Composition mobile

Composant: `src/components/signin/SigninMobileComponent.tsx`

Structure:

1. Header simple avec retour.
2. Titre + sous-texte.
3. Formulaire signin.
4. Lien mot de passe oublié.
5. Séparateur + bouton Google.
6. Lien vers signup.

---

## 4) États UI requis

1. **Idle**:
   - tous champs éditables
   - CTA actif
2. **Submitting credentials**:
   - CTA principal en loading
   - social buttons désactivés
3. **Submitting OAuth**:
   - bouton Google en loading
   - formulaire désactivé
4. **Error**:
   - toast destructif avec message mapé
5. **Success**:
   - toast succès + redirect

---

## 5) Règles de comportement UI

1. Le query param `error` reçu sur `/signin` déclenche un toast dédié.
2. Après affichage, l’URL est nettoyée (`router.replace('/signin')`).
3. Les validations formulaire reposent sur `FormLoginSchema`.
4. Les messages d’erreur n’ont pas de logique dupliquée dans les composants: tout passe par `useSignin`.

---

## 6) Typographie, couleurs et interactions

1. Palette auth:
   - primaire: `#146B67`
   - accent: `#1FA89B`
2. CTA principal:
   - gradient primaire -> accent
3. Bouton social:
   - outline neutre
   - spinner en loading
4. Animations:
   - motions légères sur panel desktop (cohérence signup)

---

## 7) Entrées/sorties UI

Entrées:

- email
- mot de passe
- événement click Google

Sorties:

- toast erreur/succès
- redirect `/property`
- refresh écran via session NextAuth

---

## 8) Dette UI résiduelle

1. Ajouter tests composants RTL sur `SigninFormModern`.
2. Ajouter snapshots visuels (si stratégie QA visuelle adoptée).
