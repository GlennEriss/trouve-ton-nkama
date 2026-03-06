# FEATURE-005 : Politique Numéro de Téléphone (Gabon)

> **Statut** : Design/Architecture (sans implémentation dans ce document)  
> **Périmètre** : Auth (signup + complete-profile), cohérence data, anti-usurpation

---

## 1) Problème métier

Deux problèmes existent aujourd'hui:

1. Le format téléphone n'est pas strictement unifié (plusieurs variantes acceptées).
2. Unicité ne veut pas dire propriété: un utilisateur peut saisir le numéro d'une autre personne si ce numéro n'est pas encore enregistré.

Conséquence: qualité de données faible et risque d'usurpation de numéro.

---

## 2) État actuel (constaté)

- Signup (`AuthServiceImpl`) vérifie l'unicité via `findByPhoneNumber`.
- La recherche repose sur une comparaison exacte dans `phoneNumbers` (array-contains).
- Le flux Google `complete-profile` valide le format, mais ne fait pas de contrôle explicite d'unicité.
- La normalisation n'est pas imposée de manière unique avant stockage dans tous les flux.

Conclusion: deux écritures différentes d'un même numéro peuvent contourner l'unicité; et la propriété du numéro n'est pas prouvée.

---

## 3) Décisions d'architecture

### 3.1 Format canonique unique

Le numéro stocké et comparé doit être **canonique**:

- `phone.canonical`: format E.164 Gabon, ex: `+24162123456`
- `phone.raw`: valeur saisie (audit/support)
- `phone.country`: `GA`
- `phone.status`: `UNVERIFIED | VERIFIED`

Règle clé: **toutes les comparaisons d'unicité se font sur `phone.canonical` uniquement**.

### 3.2 Gabon uniquement (mobile)

Le domaine auth accepte uniquement les numéros **mobiles Gabon** (pas les fixes).

Deux niveaux de validation:

1. Validation structurelle (Gabon):  
   - Canonique: `^\+241\d{8}$`
2. Validation métier (préfixes autorisés):  
   - Les préfixes autorisés sont gérés dans une configuration versionnée (`GA_ALLOWED_PREFIXES`), pas en dur dans les composants UI.

Note: la transition de plan de numérotation est gérée par configuration, pas par duplication de regex dispersées.

#### Préfixes mobiles Gabon à retenir

- Libertis: `62`, `66`
- Moov: `65`
- Airtel: `74`, `77`

Regex canonique mobile (source de vérité côté domaine auth):

- `^\+241(62|65|66|74|77)\d{6}$`

Regex champ numéro (si indicatif `+241` séparé en UI):

- Strict (recommandé): `^(62|65|66|74|77)\d{6}$`
- Tolérant migration UX (si on accepte `0` initial): `^0?(62|65|66|74|77)\d{6}$`

Décision UI recommandée:

- Le select pays/indicatif reste figé à `+241`.
- Le champ numéro saisit uniquement la partie nationale mobile.
- Affichage exemple: `62 12 34 56` (sans `+241`).
- Stockage final: toujours `phone.canonical` en E.164 (ex: `+24162123456`).

### 3.3 Service centralisé téléphone

Créer un service métier unique (ex: `PhonePolicyService`) qui fait:

1. `normalize(raw) -> canonical`
2. `validate(canonical) -> valid/invalid + reason`
3. `assertUniqueness(canonical)`

Interdiction d'appeler Firestore directement depuis les composants pour ces règles.

---

## 4) Anti-usurpation: ce qui est possible et ce qui ne l'est pas

Sans vérification OTP, on ne peut pas prouver la propriété réelle du numéro.

Donc:

- Oui, l'inscription peut passer avec le numéro de quelqu'un d'autre si ce numéro n'est pas encore lié.
- L'unicité seule ne protège pas contre ce cas.

Décision produit recommandée:

1. Au signup/complete-profile, numéro en `UNVERIFIED`.
2. Le numéro ne donne aucun privilège sensible tant qu'il n'est pas `VERIFIED`.
3. La vérification OTP reste une feature séparée (profil), mais c'est elle qui apporte la preuve de possession.

---

## 5) Unicité robuste (anti-race condition)

Le pattern "read then write" n'est pas suffisant à forte concurrence.

Approche cible:

- Collection d'index dédiée: `phone_index/{canonical}`
- Écriture transactionnelle:
  1. Vérifier absence de doc index
  2. Créer/réserver index avec `uid`
  3. Créer/mettre à jour user
  4. Commit atomique

Ainsi, deux comptes ne peuvent pas obtenir le même numéro canonique simultanément.

---

## 6) Contrat fonctionnel cible

### 6.1 Signup email/password

1. Saisie numéro -> normalisation canonique
2. Validation Gabon + préfixes
3. Réservation unique atomique
4. Création compte
5. Statut téléphone initial: `UNVERIFIED`

### 6.2 Complete-profile (Google)

Même pipeline que signup (normalisation + unicité atomique), pas une logique parallèle.

### 6.3 Contrat précis avec champ split (`+241` + numéro)

Entrée UI:

- `dialCode`: `+241` (non éditable)
- `localNumber`: ex `62123456`

Assemblage:

1. nettoyer espaces/tirets
2. retirer `0` initial si présent (mode tolérant)
3. valider `localNumber` contre les préfixes mobiles autorisés
4. construire `phone.canonical = +241 + localNumber`

Règle:

- on ne persiste jamais `+2410...`
- on ne compare jamais des formats non canoniques

---

## 7) Observabilité & incident

Journaliser en structuré:

- `auth.phone.validation_failed`
- `auth.phone.normalized`
- `auth.phone.duplicate_detected`
- `auth.phone.uniqueness_conflict`
- `auth.phone.assignment_succeeded`

Contexte minimal:

- `uid`, `flow` (`signup` | `complete-profile`), `country`, `canonicalHash` (jamais le numéro brut en clair dans les logs), `reason`.

Alertes recommandées:

- hausse anormale de `duplicate_detected`
- hausse anormale de `uniqueness_conflict`
- taux d'échec validation > seuil

---

## 8) Plan de livraison (sans code ici)

### Phase A - Alignement règles

1. Définir la source unique des regex/préfixes Gabon.
2. Documenter les cas valides/invalides.
3. Interdire les validations divergentes entre Signup et Complete-profile.

### Phase B - Data model

1. Introduire `phone.canonical`, `phone.raw`, `phone.status`.
2. Préparer migration des données existantes.

### Phase C - Unicité atomique

1. Introduire `phone_index`.
2. Refactor service auth pour transaction unique.
3. Appliquer la même logique sur complete-profile.

### Phase D - Contrôles de sécurité

1. Restreindre les actions sensibles aux numéros `VERIFIED` (feature dédiée).
2. Ajouter logs et alertes d'incident.

---

## 9) Critères d'acceptation

1. Deux formats différents d'un même numéro aboutissent au même `phone.canonical`.
2. Un numéro déjà utilisé est refusé dans signup **et** complete-profile.
3. Aucun doublon possible en concurrence.
4. Le système distingue clairement `UNVERIFIED` vs `VERIFIED`.
5. Les incidents téléphone sont visibles dans les logs structurés.

---

## 10) Hors scope de FEATURE-005

- Implémentation OTP elle-même (feature dédiée profil/téléphone).
- UX détaillée de vérification téléphone dans l'espace compte.

---

## 11) Références (réglementaires / techniques)

- ITU Operational Bulletin No. 1288 (15.III.2024), communication ARCEP Gabon du 28.II.2024: fin du 8 chiffres et format national/international.
- ITU Operational Bulletin No. 1174 (15.VI.2019), communication ARCEP Gabon: détail des préfixes mobiles (62, 65, 66, 74, 77) et exemples d'appel.
