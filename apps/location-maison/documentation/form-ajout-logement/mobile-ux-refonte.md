# Refonte Mobile UI/UX - Formulaire d'ajout d'annonce

## 1. Contexte

Les retours utilisateurs sont globalement positifs sur le projet, mais le parcours d'ajout d'annonce est encore difficile sur mobile (cas d'usage principal).

Routes concernées :
- `/property/add`
- `/property/add/home`, `/property/add/studio`, `/property/add/apartment`, `/property/add/villa`, `/property/add/building`, `/property/add/desk`, `/property/add/room`, `/property/add/shop`, `/property/add/kiosk`, `/property/add/land`
- Correspondant fonctionnel : `/property/add/[typeProperty]`

Objectif de cette note : cadrer une mise à jour propre et progressive, sans casser les features existantes.

---

## 2. Diagnostic (état actuel)

## 2.1 Assistant IA qui masque le formulaire (mobile)

Constats techniques :
- `src/components/stepper/FormProperty.tsx` affiche toujours `FlatBotAssistant` sur le parcours d'ajout.
- `src/components/ai-assistant/FlatBotAssistant.tsx` positionne le launcher en `fixed` avec `bottom-72 right-6` sur mobile.
- `src/components/ai-assistant/WelcomeMessage.tsx` affiche en plus une bulle au-dessus du launcher.

Impact UX :
- chevauchement visuel des champs et CTA du formulaire sur petits écrans
- réduction de la zone réellement utilisable pendant la saisie
- perception de friction sur les étapes longues

## 2.2 Grand vide blanc en haut des pages avec header titre

Cause principale identifiée :
- `src/app/(protected)/layout.tsx` rend un conteneur sticky global avec `px-10 py-5` même quand le `Navbar` ne s'affiche pas.
- `src/components/home-page/Navbar.tsx` retourne `null` sur mobile utilisateur connecté.
- le conteneur sticky reste donc vide mais conserve sa hauteur/padding, ce qui crée un espace blanc en haut.

## 2.3 Incohérences de headers sticky

Plusieurs pages implémentent un header sticky "maison" avec des classes différentes :
- `src/app/(protected)/property/add/page.tsx`
- `src/app/(protected)/property/add/(stepper)/layout.tsx`
- `src/app/(protected)/property/modify/[id]/layout.tsx`
- `src/app/(protected)/favoris/page.tsx`
- `src/app/(protected)/list-notifications/page.tsx`

Impact :
- offsets/top spacing incohérents
- risque de double sticky et de recouvrement selon viewport
- maintenance plus difficile

## 2.4 Publicités visibles dans le formulaire (à supprimer)

Constat utilisateur :
- des pubs Ads apparaissent encore pendant la saisie du formulaire d'ajout.

Sources techniques à traiter :
- `src/components/footer/Footer.tsx` contient les blocs AdSense (mobile compact + footer).
- `src/app/layout.tsx` charge globalement le script AdSense (`adsense-loader-global`) sur toutes les pages.

Impact UX :
- distraction pendant une tâche à forte concentration (remplir une annonce)
- baisse de lisibilité mobile
- sensation d'interface "polluée" dans un flow transactionnel critique

---

## 3. Objectifs de refonte

1. Mobile-first réel sur tout le parcours d'ajout d'annonce.
2. Zéro blocage visuel du formulaire par l'assistant IA.
3. Header sticky cohérent, sans espace blanc parasite.
4. Zéro publicité visible dans le flow formulaire (`/property/add*`, `/property/modify/*`).
5. Conservation des comportements métier existants (stepper, validation, génération IA, preview, submit).
6. Déploiement progressif et réversible.

---

## 4. Stratégie d'implémentation (Pattern Strategy via interfaces)

Pour éviter les régressions, on isole les décisions d'UI mobile/desktop via des stratégies explicites.

## 4.1 Interface de stratégie Header

```ts
export interface PageHeaderStrategy {
  getContainerClasses(): string
  getStickyTopOffset(): string
  showBackButton(pathname: string): boolean
}
```

Stratégies prévues :
- `MobileCompactHeaderStrategy`
- `DesktopHeaderStrategy`
- `LegacyHeaderStrategy` (fallback de sécurité)

## 4.2 Interface de stratégie Assistant IA

```ts
export interface AssistantLayoutStrategy {
  getLauncherClasses(): string
  getModalVariant(): 'center-modal' | 'bottom-sheet'
  shouldShowWelcomeMessage(): boolean
}
```

Stratégies prévues :
- `MobileNonBlockingAssistantStrategy`
- `DesktopFloatingAssistantStrategy`
- `LegacyAssistantStrategy` (fallback de sécurité)

## 4.3 Pourquoi cette approche

- évite les if/else dispersés dans les composants
- permet une migration incrémentale par feature flag
- maintient le comportement desktop actuel comme référence stable

---

## 5. Plan de migration sans casse

## Phase 1 - Correctifs structurels sûrs (priorité haute)

1. Corriger l'espace blanc du layout protégé.
- rendre le wrapper sticky du navbar conditionnel à un contenu réel
- conserver le comportement desktop actuel

2. Introduire un composant partagé de header mobile.
- ex : `AppMobileStickyHeader`
- remplacer progressivement les headers copiés/collés

3. Aligner les offsets sticky via une seule source.
- variable CSS ou prop centralisée pour `top`

## Phase 2 - Assistant IA non bloquant (priorité haute)

1. Remplacer le positionnement mobile `bottom-72` par une stratégie safe-area.
- ex : `bottom-[calc(env(safe-area-inset-bottom)+16px)]`

2. Utiliser un bottom-sheet sur mobile (au lieu d'une modale centrée).
- meilleure ergonomie saisie + clavier

3. Réduire l'intrusion de la bulle de bienvenue.
- affichage unique, dismissable, ou désactivée sur écrans compacts

## Phase 3 - Suppression Ads dans le formulaire (priorité haute)

1. Bloquer explicitement tout rendu AdSense dans le flow formulaire.
2. Ajouter un garde-route dédié pour ne pas charger les pubs sur `/property/add*` et `/property/modify/*`.
3. Garantir que la monétisation reste inchangée hors du flow formulaire.

## Phase 4 - Harmonisation multi-pages (priorité moyenne)

1. Appliquer le header partagé à toutes les pages sticky à titre.
2. Standardiser les classes de spacing vertical (`pt/pb`, shadow, border).
3. Valider la cohérence visuelle mobile/tablette/desktop.

---

## 6. Invariants de non-régression

À ne pas casser pendant la refonte :

1. Pipeline de formulaire :
- navigation stepper
- validation champs
- preview finale
- soumission

2. Feature IA :
- consommation de crédits
- génération auto des champs
- upload/compression images

3. Routing et droits :
- accès routes protégées existantes
- comportement annonceur inchangé côté permissions

4. Monétisation :
- conserver les pubs sur les pages non-formulaire
- supprimer les pubs uniquement dans le flow formulaire

---

## 7. Tests de validation

## 7.1 Matrix viewport

- 320x568 (petits téléphones)
- 360x800
- 390x844
- 430x932
- tablette 768x1024
- desktop >= 1024

## 7.2 Scénarios clés

1. Ouvrir `/property/add`, choisir un type, compléter les 3 étapes.
2. Vérifier que le premier champ est visible sans espace blanc anormal.
3. Ouvrir l'assistant IA, saisir/fermer, reprendre la saisie formulaire.
4. Vérifier que les boutons stepper ne sont jamais recouverts.
5. Vérifier qu'aucune pub n'apparaît dans `/property/add*` et `/property/modify/*`.
6. Valider la soumission complète avec et sans IA.

## 7.3 Régression ciblée pages header sticky

- `/property/add`
- `/property/add/*`
- `/property/modify/[id]`
- `/favoris`
- `/list-notifications`

---

## 8. Critères d'acceptation

1. Aucun espace blanc parasite en haut sur mobile connecté.
2. Aucun recouvrement critique du formulaire par l'assistant IA.
3. Header sticky homogène et lisible sur les pages ciblées.
4. 0 régression fonctionnelle sur le parcours de création d'annonce.
5. Desktop inchangé visuellement (hors correctifs explicitement validés).
6. Aucune pub Ads visible sur les écrans du formulaire.

---

## 9. Ordre d'exécution recommandé

1. Phase 1 (layout + header partagé)
2. Phase 2 (assistant IA mobile non bloquant)
3. Phase 3 (suppression Ads formulaire)
4. Phase 4 (harmonisation globale)
5. Tests E2E mobile + validation produit

Cette séquence limite le risque, sécurise les gains rapides et prépare une refonte UI/UX propre.

---

## 10. Checklist d'exécution avec branches dédiées

Branche parapluie recommandée (suivi global) :
- [ ] `epic/mobile-ux-property-add-2026q1`

Branches de travail par problème :

1. [ ] `fix/mobile-empty-top-gap-protected-layout`
- Problème ciblé : section 2.2 (grand vide blanc en haut).
- Scope : `src/app/(protected)/layout.tsx` + logique d'affichage navbar mobile.
- Fini quand : plus d'espace blanc parasite sur mobile connecté.

2. [ ] `refactor/mobile-sticky-header-shared-component`
- Problème ciblé : section 2.3 (headers sticky incohérents).
- Scope : création d'un composant partagé `AppMobileStickyHeader` + adoption progressive.
- Fini quand : structure header unifiée sur `/property/add`, `/property/add/*`, `/property/modify/[id]`, `/favoris`, `/list-notifications`.

3. [ ] `refactor/mobile-header-strategy-pattern`
- Problème ciblé : section 2.3 (standardisation durable).
- Scope : interface `PageHeaderStrategy` + stratégies mobile/desktop/fallback.
- Fini quand : plus de classes sticky dupliquées critiques dans les pages cibles.

4. [ ] `fix/mobile-ai-assistant-non-blocking-launcher`
- Problème ciblé : section 2.1 (assistant IA qui masque le formulaire).
- Scope : repositionnement launcher avec safe-area mobile.
- Fini quand : aucun champ/CTA principal n'est recouvert sur les viewports mobiles de test.

5. [ ] `feature/mobile-ai-assistant-bottom-sheet`
- Problème ciblé : section 2.1 (ergonomie d'ouverture IA).
- Scope : modal mobile en bottom-sheet non bloquante.
- Fini quand : interaction IA fluide avec clavier mobile, sans rupture du flux de saisie.

6. [ ] `fix/mobile-ai-welcome-message-intrusion`
- Problème ciblé : section 2.1 (bulle welcome intrusive).
- Scope : politique d'affichage minimaliste de `WelcomeMessage`.
- Fini quand : message non bloquant, dismissable, et compatible petits écrans.

7. [ ] `fix/remove-ads-property-form-flow`
- Problème ciblé : section 2.4 (publicités visibles dans le formulaire).
- Scope : blocage ads sur `/property/add*` et `/property/modify/*` (footer + loader global).
- Fini quand : aucune pub/overlay ads n'est visible pendant la création/modification d'annonce.

8. [ ] `test/mobile-add-property-regression`
- Problème ciblé : non-régression globale (sections 6 et 7).
- Scope : scénarios de validation mobile/tablette/desktop du parcours d'ajout.
- Fini quand : checklist de tests section 7 validée.

---

## 11. Ordre recommandé de création des branches

1. [ ] Créer `epic/mobile-ux-property-add-2026q1`
2. [ ] Créer `fix/mobile-empty-top-gap-protected-layout`
3. [ ] Créer `refactor/mobile-sticky-header-shared-component`
4. [ ] Créer `refactor/mobile-header-strategy-pattern`
5. [ ] Créer `fix/mobile-ai-assistant-non-blocking-launcher`
6. [ ] Créer `feature/mobile-ai-assistant-bottom-sheet`
7. [ ] Créer `fix/mobile-ai-welcome-message-intrusion`
8. [ ] Créer `fix/remove-ads-property-form-flow`
9. [ ] Créer `test/mobile-add-property-regression`

Commande type :

```bash
git checkout -b <nom-de-branche>
```
